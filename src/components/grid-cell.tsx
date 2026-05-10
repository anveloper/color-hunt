import { useRef } from "react";
import type { CellState } from "../types";
import { getTransform, transformCss } from "../lib/transform";

type Props = {
  cell: CellState;
  index: number;
  onUpload: (files: File[], fromIndex: number) => void;
  onActivate: () => void;
};

export default function GridCell({ cell, index, onUpload, onActivate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = !!cell.imageDataUrl;

  const handleClick = () => {
    if (filled) {
      onActivate();
    } else {
      inputRef.current?.click();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    // value 초기화 전에 배열로 스냅샷 — FileList는 input.value 클리어 시 함께 비워짐
    const arr = Array.from(fileList);
    e.target.value = "";
    onUpload(arr, index);
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
        multiple
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
