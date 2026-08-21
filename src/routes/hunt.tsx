import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AppState, CellState, GridLineMode } from "../types";
import { applyLayoutChange, nextLayout } from "../lib/layout-utils";
import { DEFAULT_STATE, loadState, saveState } from "../lib/storage";
import { composeAndDownload } from "../lib/compose";
import { resizeToDataUrl } from "../lib/image";
import { ensureLocationPermission } from "../lib/location";
import { pickPhotos, takePhoto } from "../lib/toss";
import { useBottomSheet } from "@toss/tds-mobile";
import { runDurationMs } from "../lib/overlay";
import { useRunTracker, useTicker } from "../hooks/use-run-tracker";
import GridBoard from "../components/grid-board";
import FloatingDock, { type AspectChoice } from "../components/floating-dock";
import CellEditor from "../components/cell-editor";
import OverlayLayer from "../components/overlay-layer";

const LINE_CYCLE: Record<GridLineMode, GridLineMode> = {
  white: "black",
  black: "none",
  none: "white",
};

export default function Hunt() {
  const [state, setState] = useState<AppState>(() => DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set());
  const frameRef = useRef<HTMLDivElement>(null);

  const running = state.run != null && state.run.endedAt == null;
  const now = useTicker(running);

  // 기록 중에만 좌표를 쌓는다. 마지막 점은 사진 지점 기록에도 쓰인다.
  useRunTracker(running, (p) => {
    setState((s) =>
      s.run == null || s.run.endedAt != null
        ? s
        : { ...s, run: { ...s.run, points: [...s.run.points, p] } },
    );
  });

  const { openTwoButtonSheet } = useBottomSheet();

  /**
   * 앱인토스에서 빈 셀을 눌렀을 때 사진 출처를 고르게 한다.
   * 웹은 <input accept="image/*">가 OS 차원에서 이미 앨범/카메라를 모두 준다.
   */
  const handleRequestPhoto = async (fromIndex: number, maxPickCount: number) => {
    const action = await openTwoButtonSheet({
      header: "사진을 어떻게 넣을까요?",
      leftButton: "앨범에서 고르기",
      rightButton: "사진 찍기",
    });
    try {
      if (action === "leftButtonClick") {
        const urls = await pickPhotos(maxPickCount);
        if (urls.length > 0) handleUpload(urls, fromIndex);
      } else if (action === "rightButtonClick") {
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
      return;
    }
    // 권한을 거부해도 그리드는 그대로 써야 하므로 여기서 끝낸다.
    if (!(await ensureLocationPermission())) return;
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
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  const handleChangeCell = (i: number, next: CellState) => {
    setState((s) => {
      const cells = s.cells.slice();
      cells[i] = next;
      return { ...s, cells };
    });
  };

  // sources: 웹은 File, 앱인토스는 앨범에서 받은 data URL 문자열
  const handleUpload = async (sources: (File | string)[], fromIndex: number) => {
    const targetIndices: number[] = [];
    for (let idx = fromIndex; idx < state.cells.length && targetIndices.length < sources.length; idx++) {
      if (!state.cells[idx].imageDataUrl) targetIndices.push(idx);
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

  const handleCycleLayout = () => {
    setState((s) => applyLayoutChange(s, nextLayout(s.layout)));
    setEditingIndex(null);
  };

  const handleCycleLineMode = () => {
    setState((s) => ({ ...s, gridLineMode: LINE_CYCLE[s.gridLineMode] }));
  };

  const handleSave = async (choice: AspectChoice) => {
    if (busy) return;
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
      await composeAndDownload(state, aspect, snapshot);
    } catch (err) {
      console.error("[colorhunt] download failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const editingCell =
    editingIndex !== null ? state.cells[editingIndex] : null;

  return (
    <div ref={frameRef} className="absolute inset-0">
      <GridBoard
        state={state}
        loadingIndices={loadingIndices}
        onUpload={handleUpload}
        onRequestPhoto={handleRequestPhoto}
        onActivateCell={handleActivateCell}
      />

      {editingIndex === null && (
        <OverlayLayer
          state={state}
          now={now}
          onChange={(overlays) => setState((s) => ({ ...s, overlays }))}
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

      {editingIndex === null && (
        <FloatingDock
          layout={state.layout}
          gridLineMode={state.gridLineMode}
          busy={busy}
          running={running}
          runDurationMs={runDurationMs(state.run, now)}
          onToggleRun={handleToggleRun}
          onCycleLayout={handleCycleLayout}
          onCycleLineMode={handleCycleLineMode}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
