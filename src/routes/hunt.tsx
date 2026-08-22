import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AppState, CellState, GridLineMode, Layout } from "../types";
import { applyLayoutChange } from "../lib/layout-utils";
import {
  DEFAULT_STATE,
  isDecorateHintSeen,
  loadState,
  markDecorateHintSeen,
  saveState,
  setSaveErrorHandler,
} from "../lib/storage";
import { composeAndDownload } from "../lib/compose";
import { resizeToDataUrl } from "../lib/image";
import { ensureLocationPermission } from "../lib/location";
import { pickPhotos, takePhoto } from "../lib/toss";
import { choose } from "../lib/dialog";
import { runDurationMs } from "../lib/overlay";
import { useRunTracker, useTicker } from "../hooks/use-run-tracker";
import GridBoard from "../components/grid-board";
import FloatingDock, { type AspectChoice } from "../components/floating-dock";
import CellEditor from "../components/cell-editor";
import OverlayLayer from "../components/overlay-layer";
import OverlayDock from "../components/overlay-dock";
import type { OverlayKind } from "../types";
import {
  EMPHASIS_CYCLE,
  defaultOverlayTransform,
  normalizeTrack,
} from "../lib/overlay";

export default function Hunt() {
  const [state, setState] = useState<AppState>(() => DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set());
  const frameRef = useRef<HTMLDivElement>(null);

  const running = state.run != null && state.run.endedAt == null;
  // 촬영 중에는 오버레이를 건드리지 않는다. 기록을 끝낸 뒤 고정된 화면에서만 꾸민다.
  const [decorating, setDecorating] = useState(false);
  const [decorateHint, setDecorateHint] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 꾸미기 모드에서 한 번에 하나만 조작한다.
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayKind | null>(null);
  const now = useTicker(running);

  // 기록 중에만 좌표를 쌓는다. 마지막 점은 사진 지점 기록에도 쓰인다.
  useRunTracker(running, (p) => {
    setState((s) =>
      s.run == null || s.run.endedAt != null
        ? s
        : { ...s, run: { ...s.run, points: [...s.run.points, p] } },
    );
  });

  /**
   * 앱인토스에서 빈 셀을 눌렀을 때 사진 출처를 고르게 한다.
   * 웹은 <input accept="image/*">가 OS 차원에서 이미 앨범/카메라를 모두 준다.
   */
  const handleRequestPhoto = async (fromIndex: number, maxPickCount: number) => {
    const action = await choose({
      title: "사진을 어떻게 넣을까요?",
      leftLabel: "앨범에서 고르기",
      rightLabel: "사진 찍기",
    });
    try {
      if (action === "left") {
        const urls = await pickPhotos(maxPickCount);
        if (urls.length > 0) handleUpload(urls, fromIndex);
      } else if (action === "right") {
        const url = await takePhoto();
        if (url) handleUpload([url], fromIndex);
      }
    } catch (err) {
      // 권한 거부/취소로 못 가져와도 나머지 기능은 그대로 동작해야 한다.
      console.error("[colorhunt] photo pick failed:", err);
    }
  };

  const handleToggleRun = async () => {
    if (running) {
      setState((s) =>
        s.run == null ? s : { ...s, run: { ...s.run, endedAt: Date.now() } },
      );
      // 종료하면 곧바로 꾸미기 모드로 넘어간다.
      setDecorating(true);
      if (!isDecorateHintSeen()) {
        setDecorateHint(true);
        markDecorateHintSeen();
      }
      return;
    }

    // 위치 권한을 요청하기 전에 무엇에 쓰는지 먼저 알린다.
    // 시스템 권한 팝업만 띄우면 사용자는 "기록" 버튼이 왜 위치를 묻는지 알 수 없다.
    let agreed: "left" | "right" | "cancel";
    try {
      agreed = await choose({
        title: "위치를 기록할까요?",
        description:
          "달린 경로와 사진을 찍은 지점을 남겨서, 사진 위에 함께 담을 수 있어요. " +
          "위치는 기기 안에만 저장되고 어디에도 전송되지 않아요. " +
          "허용하지 않아도 사진을 모으고 저장하는 건 그대로 할 수 있어요.",
        leftLabel: "안 할래요",
        rightLabel: "좋아요",
      });
    } catch (err) {
      console.error("[colorhunt] consent sheet failed:", err);
      return;
    }
    if (agreed !== "right") return;

    // 권한을 거부해도 그리드는 그대로 써야 하므로 여기서 끝낸다.
    let allowed = false;
    try {
      allowed = await ensureLocationPermission();
    } catch (err) {
      console.error("[colorhunt] location permission failed:", err);
    }
    if (!allowed) {
      setToast("위치 권한이 없어 기록을 시작하지 못했어요");
      return;
    }
    setState((s) => ({
      ...s,
      run: { startedAt: Date.now(), points: [], spots: [] },
    }));
  };

  useLayoutEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (toast == null) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  // 저장 실패는 한 번만 알린다. 상태가 바뀔 때마다 토스트가 반복되면
  // 오히려 앱을 못 쓴다.
  const saveErrorNotified = useRef(false);
  useEffect(() => {
    setSaveErrorHandler(() => {
      if (saveErrorNotified.current) return;
      saveErrorNotified.current = true;
      setToast("저장 공간이 가득 차 더 담기 어려워요. 저장한 뒤 지우고 다시 시작해 주세요");
    });
    return () => setSaveErrorHandler(null);
  }, []);

  // 상태에는 사진 base64가 통째로 들어 있어 직렬화가 비싸다. 러닝 중에는
  // 3초마다 좌표가 추가되므로 그때마다 수 MB를 다시 쓰게 된다. 짧게 묶어
  // 마지막 것만 저장한다. 언마운트 시에는 즉시 저장해 유실을 막는다.
  const pendingState = useRef(state);
  pendingState.current = state;
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => saveState(pendingState.current), 400);
    return () => window.clearTimeout(id);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const flush = () => saveState(pendingState.current);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [hydrated]);

  const handleChangeCell = (i: number, next: CellState) => {
    setState((s) => {
      const cells = s.cells.slice();
      cells[i] = next;
      return { ...s, cells };
    });
  };

  // sources: 웹은 File, 앱인토스는 앨범에서 받은 data URL 문자열
  const handleUpload = async (sources: (File | string)[], fromIndex: number) => {
    // 이미 처리 중인 칸은 렌더 시점 state에서는 아직 비어 있다.
    // 그것까지 빼야 동시에 두 번 고른 사진이 같은 칸을 덮어쓰지 않는다.
    const claimed = loadingIndices;
    const targetIndices: number[] = [];
    for (let idx = fromIndex; idx < state.cells.length && targetIndices.length < sources.length; idx++) {
      if (!state.cells[idx].imageDataUrl && !claimed.has(idx)) targetIndices.push(idx);
    }
    if (targetIndices.length === 0) return;

    setLoadingIndices((prev) => new Set([...prev, ...targetIndices]));

    await Promise.all(
      targetIndices.map(async (targetIndex, sourceIndex) => {
        const source = sources[sourceIndex];
        try {
          const url = await resizeToDataUrl(source);
          setState((s) => {
            const cells = s.cells.slice();
            cells[targetIndex] = {
              ...cells[targetIndex],
              imageDataUrl: url,
              transform: undefined,
            };
            // 사진을 넣은 순간의 위치를 지점으로 남긴다. 앨범 사진에는
            // 촬영 위치가 없어서(EXIF는 리사이즈 과정에서 사라진다)
            // 이 방법 말고는 지점을 알 수 없다.
            const last = s.run?.points.at(-1);
            const run =
              s.run && s.run.endedAt == null && last
                ? {
                    ...s.run,
                    spots: [
                      ...s.run.spots.filter((sp) => sp.cellIndex !== targetIndex),
                      { cellIndex: targetIndex, point: last },
                    ],
                  }
                : s.run;
            return { ...s, cells, run };
          });
        } catch (err) {
          console.error("[colorhunt] image processing failed:", err);
        } finally {
          setLoadingIndices((prev) => {
            const next = new Set(prev);
            next.delete(targetIndex);
            return next;
          });
        }
      }),
    );
  };

  const handleActivateCell = (i: number) => {
    setEditingIndex(i);
  };

  const handleCloseEditor = () => {
    setEditingIndex(null);
  };

  const handleSelectLayout = (layout: Layout) => {
    setState((s) => (s.layout === layout ? s : applyLayoutChange(s, layout)));
    setEditingIndex(null);
  };

  const handleSelectLineMode = (gridLineMode: GridLineMode) => {
    setState((s) => ({ ...s, gridLineMode }));
  };

  const handleSave = async (choice: AspectChoice) => {
    if (busy) return;
    // 오버레이는 화면 프레임 픽셀 기준으로 배치돼 있어, 어떤 비율로 저장하든
    // 화면 폭을 알아야 결과 해상도로 올바르게 환산된다.
    const screenWidth = frameRef.current?.getBoundingClientRect().width;
    let aspect: { w: number; h: number };
    let snapshot:
      | {
          frame: { w: number; h: number };
          cells: { x: number; y: number; w: number; h: number }[];
        }
      | undefined;
    if (choice === "device") {
      const el = frameRef.current;
      if (!el) return;
      const frameRect = el.getBoundingClientRect();
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>("[data-cell-index]"),
      );
      const cells = nodes
        .map((node) => {
          const idx = Number(node.dataset.cellIndex);
          const rect = node.getBoundingClientRect();
          return Number.isFinite(idx)
            ? {
                idx,
                x: rect.left - frameRect.left,
                y: rect.top - frameRect.top,
                w: rect.width,
                h: rect.height,
              }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.idx - b.idx)
        .map(({ x, y, w, h }) => ({ x, y, w, h }));

      aspect = { w: frameRect.width, h: frameRect.height };
      if (cells.length === state.cells.length) {
        snapshot = { frame: aspect, cells };
      }
    } else {
      aspect = choice;
    }
    setBusy(true);
    try {
      await composeAndDownload(state, aspect, snapshot, screenWidth);
    } catch (err) {
      console.error("[colorhunt] download failed:", err);
      setToast("저장하지 못했어요. 잠시 후 다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  const editingCell =
    editingIndex !== null ? state.cells[editingIndex] : null;

  // 데이터가 없는 요소는 켤 수 없다.
  const disabledOverlayKinds: OverlayKind[] = [];
  if (normalizeTrack(state.run) == null) disabledOverlayKinds.push("course");
  if (state.run == null) disabledOverlayKinds.push("runtime");

  // 요소를 탭하면 배경에 묻히지 않게 하는 방식이 순환한다(그림자 → 외곽선 → 판).
  const handleCycleEmphasis = (kind: OverlayKind) => {
    setState((s) => ({
      ...s,
      overlays: s.overlays.map((o) =>
        o.kind === kind ? { ...o, emphasis: EMPHASIS_CYCLE[o.emphasis] } : o,
      ),
    }));
  };

  const handleToggleOverlay = (kind: OverlayKind) => {
    // 독에서 고른 요소를 곧바로 조작 대상으로 삼는다.
    setSelectedOverlay(kind);
    setState((s) => ({
      ...s,
      overlays: s.overlays.map((o) => {
        if (o.kind !== kind) return o;
        const visible = !o.visible;
        // 껐다 켜면 원위치. 독 뒤나 화면 밖으로 밀어 넣어 다시 못 잡는
        // 상황의 탈출구다. 버튼을 늘리지 않고 되돌릴 수 있다.
        return visible
          ? { ...o, visible, transform: defaultOverlayTransform(kind) }
          : { ...o, visible };
      }),
    }));
  };

  return (
    <div ref={frameRef} className="absolute inset-0">
      <GridBoard
        state={state}
        loadingIndices={loadingIndices}
        onUpload={handleUpload}
        onRequestPhoto={handleRequestPhoto}
        onActivateCell={handleActivateCell}
      />

      {decorating && editingIndex === null && (
        <OverlayLayer
          state={state}
          now={now}
          selected={selectedOverlay}
          onSelect={setSelectedOverlay}
          onChange={(overlays) => setState((s) => ({ ...s, overlays }))}
          onCycleEmphasis={handleCycleEmphasis}
        />
      )}

      {editingCell && editingIndex !== null && (
        <CellEditor
          cell={editingCell}
          index={editingIndex}
          layout={state.layout}
          onUpdate={(next) => handleChangeCell(editingIndex, next)}
          onClose={handleCloseEditor}
        />
      )}

      {toast != null && (
        <div
          className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center px-6"
          role="status"
          aria-live="polite"
        >
          <p className="rounded-2xl bg-ink/85 px-4 py-2.5 text-center text-sm text-paper shadow-lg backdrop-blur">
            {toast}
          </p>
        </div>
      )}

      {decorating && decorateHint && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center px-6">
          <p className="rounded-2xl bg-ink/85 px-4 py-2.5 text-center text-sm leading-tight text-paper shadow-lg backdrop-blur">
            요소를 탭해서 하나 고르고, 끌거나 두 손가락으로 조절해요
            <br />
            <b>고른 요소를 다시 탭하면 배경에 묻히지 않게 바뀌어요</b>
          </p>
        </div>
      )}

      {decorating && editingIndex === null && (
        <OverlayDock
          overlays={state.overlays}
          disabledKinds={disabledOverlayKinds}
          onToggle={handleToggleOverlay}
          onDone={() => {
            setDecorating(false);
            setDecorateHint(false);
            setSelectedOverlay(null);
          }}
        />
      )}

      {!decorating && editingIndex === null && (
        <FloatingDock
          layout={state.layout}
          gridLineMode={state.gridLineMode}
          busy={busy}
          running={running}
          runDurationMs={runDurationMs(state.run, now)}
          onToggleRun={handleToggleRun}
          canDecorate={state.run != null && !running}
          onDecorate={() => setDecorating(true)}
          onSelectLayout={handleSelectLayout}
          onSelectLineMode={handleSelectLineMode}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
