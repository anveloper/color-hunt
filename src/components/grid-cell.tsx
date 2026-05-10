import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CellState } from "../types";
import { getTransform } from "../lib/transform";

type Props = {
  cell: CellState;
  index: number;
  onUpload: (files: File[], fromIndex: number) => void;
  onActivate: () => void;
};

export default function GridCell({ cell, index, onUpload, onActivate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLButtonElement>(null);
  const filled = !!cell.imageDataUrl;

  // 자연 크기 + 셀 크기 → cover 픽셀 사이즈로 렌더해야 수정 모드와 동일하게 동작
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [cellSize, setCellSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (!cell.imageDataUrl) {
      setImgNatural(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = cell.imageDataUrl;
  }, [cell.imageDataUrl]);

  // 초기 페인트 전에 셀 크기를 잡아둬서 첫 프레임부터 cover-px 박스로 그릴 수 있게
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

  const coverDim = useMemo(() => {
    if (!imgNatural || cellSize.w === 0 || cellSize.h === 0) return null;
    const ratio = Math.max(cellSize.w / imgNatural.w, cellSize.h / imgNatural.h);
    return { w: imgNatural.w * ratio, h: imgNatural.h * ratio };
  }, [imgNatural, cellSize]);

  const t = getTransform(cell.transform);
  const cssTransform = useMemo(() => {
    if (cellSize.w === 0) {
      return `translate(${(t.offsetX * 100).toFixed(3)}%, ${(t.offsetY * 100).toFixed(3)}%) rotate(${t.rotation}deg) scale(${t.scale})`;
    }
    const tx = (t.offsetX * cellSize.w).toFixed(3);
    const ty = (t.offsetY * cellSize.h).toFixed(3);
    return `translate(${tx}px, ${ty}px) rotate(${t.rotation}deg) scale(${t.scale})`;
  }, [t, cellSize]);

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
    const arr = Array.from(fileList);
    e.target.value = "";
    onUpload(arr, index);
  };

  return (
    <button
      ref={cellRef}
      type="button"
      data-cell-index={index}
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
          className="absolute left-1/2 top-1/2 max-w-none max-h-none select-none"
          style={{
            width: coverDim ? `${coverDim.w}px` : "100%",
            height: coverDim ? `${coverDim.h}px` : "100%",
            objectFit: "cover", // 자연 크기 로드 전엔 cover로, 로드 후엔 박스가 자연비라 no-op
            transformOrigin: "center center",
            // 셀 중앙(left/top:50%)에서 img 본인 크기의 -50%로 보정 → 항상 정중앙
            transform: `translate(-50%, -50%) ${cssTransform}`,
            willChange: "transform",
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
