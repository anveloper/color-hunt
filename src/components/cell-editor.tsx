import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TapButton from "./tap-button";
import { useGesture } from "@use-gesture/react";
import type { CellState, Layout, Transform } from "../types";
import { LAYOUT_DIMS } from "../lib/layout-utils";
import { IDENTITY_TRANSFORM, SCALE_BOUNDS, getTransform } from "../lib/transform";
import { resizeToDataUrl } from "../lib/image";
import { isEditHintSeen, markEditHintSeen } from "../lib/storage";

const HINT_AUTO_DISMISS_MS = 3500;

type Props = {
  cell: CellState;
  index: number;
  layout: Layout;
  onUpdate: (next: CellState) => void;
  onClose: () => void;
};

export default function CellEditor({ cell, index, layout, onUpdate, onClose }: Props) {
  const { cols, rows } = LAYOUT_DIMS[layout];
  const col = index % cols;
  const row = Math.floor(index / cols);

  const cellRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [t, setT] = useState<Transform>(getTransform(cell.transform));
  const tRef = useRef(t);
  tRef.current = t;

  const [coarse, setCoarse] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const [hintVisible, setHintVisible] = useState(false);

  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [cellSize, setCellSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // 자연 크기 로드 — cover-fit 후의 진짜 크기를 알아야 셀 밖 영역도 표시할 수 있음
  useEffect(() => {
    if (!cell.imageDataUrl) return;
    const img = new Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = cell.imageDataUrl;
  }, [cell.imageDataUrl]);

  // 셀 픽셀 크기 추적 — 첫 프레임부터 cover-px 박스로 그리도록 useLayoutEffect 사용
  useLayoutEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setCellSize({ w: rect.width, h: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 셀을 cover로 채우는 이미지 픽셀 크기 (transform identity 시 셀 정확히 cover, 잘리는 측면이 셀 밖으로 빠져나감)
  const coverDim = useMemo(() => {
    if (!imgNatural || cellSize.w === 0 || cellSize.h === 0) return null;
    const ratio = Math.max(cellSize.w / imgNatural.w, cellSize.h / imgNatural.h);
    return { w: imgNatural.w * ratio, h: imgNatural.h * ratio };
  }, [imgNatural, cellSize]);

  // offsetX/Y는 셀 너비/높이 비율로 저장됨 → 픽셀로 변환해 transform에 적용
  const cssTransform = useMemo(() => {
    if (cellSize.w === 0) {
      return `translate(${(t.offsetX * 100).toFixed(3)}%, ${(t.offsetY * 100).toFixed(3)}%) rotate(${t.rotation}deg) scale(${t.scale})`;
    }
    const tx = (t.offsetX * cellSize.w).toFixed(3);
    const ty = (t.offsetY * cellSize.h).toFixed(3);
    return `translate(${tx}px, ${ty}px) rotate(${t.rotation}deg) scale(${t.scale})`;
  }, [t, cellSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(pointer: coarse)");
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // 첫 진입 자동 노출
  useLayoutEffect(() => {
    if (!isEditHintSeen()) {
      setHintVisible(true);
      markEditHintSeen();
    }
  }, []);

  // 힌트 자동 dismiss 타이머
  useEffect(() => {
    if (!hintVisible) return;
    const tid = window.setTimeout(() => setHintVisible(false), HINT_AUTO_DISMISS_MS);
    return () => window.clearTimeout(tid);
  }, [hintVisible]);

  // 제스처 중에는 로컬 t로만 렌더하고, 끝날 때 한 번만 올린다.
  // 매 프레임 올리면 base64 사진이 통째로 든 state가 LocalStorage에
  // 계속 다시 쓰인다(9컷이면 매번 수 MB 직렬화).
  const commit = (next: Transform) => onUpdate({ ...cell, transform: next });

  // 삭제 등으로 이미지가 사라지면 편집 모드를 닫는다.
  // 렌더 중에 부모 상태를 바꾸면 React가 경고하고 렌더가 한 번 더 돈다.
  useEffect(() => {
    if (!cell.imageDataUrl) onClose();
  }, [cell.imageDataUrl, onClose]);

  // 제스처가 last 없이 끊기거나(포인터 취소) 편집을 바로 닫아도
  // 마지막 변환이 유실되지 않게 언마운트 시 한 번 더 올린다.
  const cellRefForUnmount = useRef({ cell, onUpdate });
  cellRefForUnmount.current = { cell, onUpdate };
  useEffect(() => {
    return () => {
      const { cell: c, onUpdate: up } = cellRefForUnmount.current;
      const last = tRef.current;
      const saved = getTransform(c.transform);
      const same =
        saved.scale === last.scale &&
        saved.rotation === last.rotation &&
        saved.offsetX === last.offsetX &&
        saved.offsetY === last.offsetY;
      // 삭제된 셀에는 되살리지 않는다.
      if (!same && c.imageDataUrl != null) up({ ...c, transform: last });
    };
  }, []);

  useGesture(
    {
      onPinch: ({ offset: [scale, angle], last }) => {
        setHintVisible(false);
        const next = { ...tRef.current, scale, rotation: angle };
        setT(next);
        if (last) commit(next);
      },
      onDrag: ({ offset: [px, py], last }) => {
        setHintVisible(false);
        const r = cellRef.current?.getBoundingClientRect();
        if (!r) return;
        const next = {
          ...tRef.current,
          offsetX: px / r.width,
          offsetY: py / r.height,
        };
        setT(next);
        if (last) commit(next);
      },
      onWheel: ({ event, delta: [, dy], last }) => {
        event.preventDefault();
        setHintVisible(false);
        const factor = Math.exp(-dy * 0.0015);
        const next = {
          ...tRef.current,
          scale: Math.min(
            SCALE_BOUNDS.max,
            Math.max(SCALE_BOUNDS.min, tRef.current.scale * factor),
          ),
        };
        setT(next);
        if (last) commit(next);
      },
    },
    {
      target: cellRef,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: SCALE_BOUNDS,
        rubberband: true,
        from: () => [tRef.current.scale, tRef.current.rotation],
      },
      drag: {
        from: () => {
          const r = cellRef.current?.getBoundingClientRect();
          if (!r) return [0, 0];
          return [tRef.current.offsetX * r.width, tRef.current.offsetY * r.height];
        },
      },
    },
  );

  const handleReplaceClick = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      setT(IDENTITY_TRANSFORM);
      onUpdate({ ...cell, imageDataUrl: dataUrl, transform: undefined });
    } catch (err) {
      console.error("[colorhunt] image processing failed:", err);
    }
  };

  const handleDelete = () => {
    onUpdate({ id: cell.id });
    onClose();
  };

  const handleResetTransform = () => {
    setHintVisible(false);
    setT(IDENTITY_TRANSFORM);
    commit(IDENTITY_TRANSFORM);
  };


  return (
    <>
      <div
        className="absolute inset-0 z-20 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="수정 종료"
      />
      <div
        ref={cellRef}
        className="absolute z-30"
        style={{
          left: `${(col * 100) / cols}%`,
          top: `${(row * 100) / rows}%`,
          width: `${100 / cols}%`,
          height: `${100 / rows}%`,
          touchAction: "none",
        }}
      >
        {/* 셀 바깥으로 빠져나가는 영역을 흐리게 보여주는 고스트 레이어 (원본 cover 크기 유지) */}
        <img
          src={cell.imageDataUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-none max-h-none opacity-25 select-none"
          style={{
            width: coverDim ? `${coverDim.w}px` : "100%",
            height: coverDim ? `${coverDim.h}px` : "100%",
            objectFit: "cover",
            transformOrigin: "center center",
            // 셀 중앙(left/top:50%)에서 img 본인 크기의 -50%로 보정 → 항상 정중앙
            transform: `translate(-50%, -50%) ${cssTransform}`,
            willChange: "transform",
          }}
        />
        {/* 실제 그리드에 들어가는(=저장되는) 선명 영역 */}
        <div className="absolute inset-0 overflow-hidden bg-paper outline outline-2 outline-pencil-red">
          <img
            src={cell.imageDataUrl}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 max-w-none max-h-none select-none"
            style={{
              width: coverDim ? `${coverDim.w}px` : "100%",
              height: coverDim ? `${coverDim.h}px` : "100%",
              objectFit: "cover",
              transformOrigin: "center center",
              transform: `translate(-50%, -50%) ${cssTransform}`,
              willChange: "transform",
            }}
          />
        </div>
      </div>

      {hintVisible && (
        <HintToast coarse={coarse} onDismiss={() => setHintVisible(false)} />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-ink/15 bg-paper/90 px-3 py-2 shadow-xl backdrop-blur">
          <EditButton onClick={handleResetTransform} label="초기화" sub="위치 · 확대" />
          <Divider />
          <EditButton onClick={handleReplaceClick} label="재업로드" sub="사진 교체" />
          <Divider />
          <EditButton onClick={handleDelete} label="삭제" sub="비우기" tone="warn" />
          <Divider />
          <EditButton onClick={onClose} label="완료" sub="저장" accent />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}

function HintToast({
  coarse,
  onDismiss,
}: {
  coarse: boolean;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-6">
      <TapButton
        onClick={onDismiss}
        className="pointer-events-auto rounded-2xl bg-ink/85 px-5 py-2.5 text-paper shadow-lg backdrop-blur transition-opacity"
        ariaLabel="도움말 닫기"
      >
        <div className="flex flex-col items-center gap-0.5 text-sm leading-tight">
          <span className={coarse ? "opacity-45" : "font-bold"}>
            드래그 = 이동 · 휠 = 확대/축소
          </span>
          <span className={coarse ? "font-bold" : "opacity-45"}>
            한 손가락 = 이동 · 두 손가락 = 확대/회전
          </span>
        </div>
      </TapButton>
    </div>
  );
}

type EditButtonProps = {
  label: string;
  sub: string;
  onClick: () => void;
  accent?: boolean;
  tone?: "warn";
};

function EditButton({ label, sub, onClick, accent, tone }: EditButtonProps) {
  const cls = accent
    ? "bg-ink text-paper"
    : tone === "warn"
      ? "text-pencil-red hover:bg-pencil-red/10"
      : "text-ink hover:bg-ink/5";
  return (
    <TapButton
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-full px-4 py-1.5 text-center transition-transform active:scale-95 ${cls}`}
    >
      <span className="text-base leading-none font-bold">{label}</span>
      <span className="text-[10px] leading-tight opacity-60">{sub}</span>
    </TapButton>
  );
}

function Divider() {
  return <span className="h-6 w-px bg-ink/15" aria-hidden="true" />;
}
