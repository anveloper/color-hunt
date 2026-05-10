import { useRef } from "react";
import type { CellState } from "../types";
import { resizeToDataUrl } from "../lib/image";
import { getTransform, transformCss } from "../lib/transform";

type Props = {
  cell: CellState;
  onChange: (next: CellState) => void;
  onActivate: () => void;
};

export default function GridCell({ cell, onChange, onActivate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = !!cell.imageDataUrl;

  const handleClick = () => {
    if (filled) {
      onActivate();
    } else {
      inputRef.current?.click();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      onChange({ ...cell, imageDataUrl: dataUrl, transform: undefined });
    } catch (err) {
      console.error("[colorhunt] image processing failed:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative flex items-center justify-center overflow-hidden bg-paper/40 select-none"
      style={{ touchAction: "manipulation" }}
      aria-label={filled ? "사진 수정" : "사진 추가"}
    >
      {filled ? (
        <img
          src={cell.imageDataUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            transformOrigin: "center center",
            transform: transformCss(getTransform(cell.transform)),
          }}
        />
      ) : (
        <span className="text-3xl text-ink/30">+</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
