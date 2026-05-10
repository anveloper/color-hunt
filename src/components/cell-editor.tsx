import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

  // 셀 픽셀 크기 추적 — 디바이스 리사이즈/회전에도 반응
  useEffect(() => {
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

  useEffect(() => {
    onUpdate({ ...cell, transform: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useGesture(
    {
      onPinch: ({ offset: [scale, angle] }) => {
        setHintVisible(false);
        setT((cur) => ({ ...cur, scale, rotation: angle }));
      },
      onDrag: ({ offset: [px, py] }) => {
        setHintVisible(false);
        const r = cellRef.current?.getBoundingClientRect();
        if (!r) return;
        setT((cur) => ({
          ...cur,
          offsetX: px / r.width,
          offsetY: py / r.height,
        }));
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        setHintVisible(false);
        setT((cur) => {
          const factor = Math.exp(-dy * 0.0015);
          const next = Math.min(
            SCALE_BOUNDS.max,
            Math.max(SCALE_BOUNDS.min, cur.scale * factor),
          );
          return { ...cur, scale: next };
        });
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

  const handleShowHint = () => setHintVisible(true);

  if (!cell.imageDataUrl) {
    onClose();
    return null;
  }

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
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <img
            src={cell.imageDataUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="max-w-none max-h-none opacity-25 select-none"
            style={{
              width: coverDim ? `${coverDim.w}px` : "100%",
              height: coverDim ? `${coverDim.h}px` : "100%",
              transformOrigin: "center center",
              transform: cssTransform,
              willChange: "transform",
            }}
          />
        </div>
        {/* 실제 그리드에 들어가는(=저장되는) 선명 영역 */}
        <div className="absolute inset-0 overflow-hidden bg-paper outline outline-2 outline-pencil-red">
          <div className="absolute inset-0 grid place-items-center">
            <img
              src={cell.imageDataUrl}
              alt=""
              draggable={false}
              className="max-w-none max-h-none select-none"
              style={{
                width: coverDim ? `${coverDim.w}px` : "100%",
                height: coverDim ? `${coverDim.h}px` : "100%",
                transformOrigin: "center center",
                transform: cssTransform,
                willChange: "transform",
              }}
            />
          </div>
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
          <EditButton onClick={handleShowHint} label="?" sub="도움말" />
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
      <button
        type="button"
        onClick={onDismiss}
        className="pointer-events-auto rounded-2xl bg-ink/85 px-5 py-2.5 text-paper shadow-lg backdrop-blur transition-opacity"
        aria-label="도움말 닫기"
      >
        <div className="flex flex-col items-center gap-0.5 text-sm leading-tight">
          <span className={coarse ? "opacity-45" : "font-bold"}>
            드래그 = 이동 · 휠 = 확대/축소
          </span>
          <span className={coarse ? "font-bold" : "opacity-45"}>
            한 손가락 = 이동 · 두 손가락 = 확대/회전
          </span>
        </div>
      </button>
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
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-full px-4 py-1.5 text-center transition-transform active:scale-95 ${cls}`}
    >
      <span className="text-base leading-none font-bold">{label}</span>
      <span className="text-[10px] leading-tight opacity-60">{sub}</span>
    </button>
  );
}

function Divider() {
  return <span className="h-6 w-px bg-ink/15" aria-hidden="true" />;
}
