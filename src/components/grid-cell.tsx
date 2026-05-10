import { useRef } from "react";
import type { CellState } from "../types";
import { resizeToDataUrl } from "../lib/image";

type Props = {
  cell: CellState;
  onChange: (next: CellState) => void;
};

export default function GridCell({ cell, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      onChange({ ...cell, imageDataUrl: dataUrl });
    } catch (err) {
      console.error("[colorhunt] image processing failed:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePick}
      className="relative flex items-center justify-center overflow-hidden bg-paper/40 select-none"
      style={{ touchAction: "none" }}
      aria-label={cell.imageDataUrl ? "사진 교체" : "사진 추가"}
    >
      {cell.imageDataUrl ? (
        <img
          src={cell.imageDataUrl}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
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
