import { useEffect, useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import type { CellState, Layout, Transform } from "../types";
import { LAYOUT_DIMS } from "../lib/layout-utils";
import { IDENTITY_TRANSFORM, SCALE_BOUNDS, getTransform, transformCss } from "../lib/transform";
import { resizeToDataUrl } from "../lib/image";

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

  useEffect(() => {
    onUpdate({ ...cell, transform: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useGesture(
    {
      onPinch: ({ offset: [scale, angle] }) => {
        setT((cur) => ({ ...cur, scale, rotation: angle }));
      },
      onDrag: ({ offset: [px, py] }) => {
        const r = cellRef.current?.getBoundingClientRect();
        if (!r) return;
        setT((cur) => ({
          ...cur,
          offsetX: px / r.width,
          offsetY: py / r.height,
        }));
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
        className="absolute z-30 overflow-hidden bg-paper outline outline-2 outline-pencil-red"
        style={{
          left: `${(col * 100) / cols}%`,
          top: `${(row * 100) / rows}%`,
          width: `${100 / cols}%`,
          height: `${100 / rows}%`,
          touchAction: "none",
        }}
      >
        <img
          src={cell.imageDataUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover select-none"
          style={{
            transformOrigin: "center center",
            transform: transformCss(t),
            willChange: "transform",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-ink/15 bg-paper/90 px-3 py-2 shadow-xl backdrop-blur">
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
