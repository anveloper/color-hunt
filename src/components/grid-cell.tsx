import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CellState } from "../types";
import { getTransform } from "../lib/transform";
import { isInToss } from "../lib/toss";

type Props = {
  cell: CellState;
  index: number;
  loading: boolean;
  /** 이 셀부터 뒤로 남은 빈 셀 수 — 앱인토스 앨범에서 한 번에 고를 최대 장수 */
  maxPickCount: number;
  onUpload: (sources: (File | string)[], fromIndex: number) => void;
  /** 앱인토스에서 사진 출처(앨범/카메라)를 고르게 한다. 웹에서는 쓰이지 않는다. */
  onRequestPhoto: (fromIndex: number, maxPickCount: number) => void;
  onActivate: () => void;
};

export default function GridCell({
  cell,
  index,
  loading,
  maxPickCount,
  onUpload,
  onRequestPhoto,
  onActivate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
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
      return;
    }
    // 앱인토스에서는 앨범/카메라를 고르는 시트를 부모가 띄운다.
    // 웹은 <input accept="image/*">가 OS 차원에서 이미 둘 다 제공한다.
    if (isInToss()) {
      onRequestPhoto(index, maxPickCount);
      return;
    }
    inputRef.current?.click();
  };

  // <div role="button">은 키보드 활성화를 직접 처리해야 한다.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleClick();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    e.target.value = "";
    onUpload(arr, index);
  };

  return (
    // <button>이 아니라 <div>인 이유가 두 가지 있다.
    // 1. TDS 전역 리셋이 button { overflow: visible; border-radius: 0 }을 무레이어로
    //    주입해서, @layer utilities 안에 있는 Tailwind의 overflow-hidden을 이겨버린다.
    //    (레이어 규칙은 specificity와 무관하게 무레이어 규칙에 진다.)
    //    div는 리셋 대상이 아니라 클래스가 그대로 먹는다.
    // 2. <button>의 콘텐츠 모델은 interactive 자손을 허용하지 않는데
    //    아래에 <input type="file">이 들어간다.
    <div
      ref={cellRef}
      role="button"
      tabIndex={0}
      data-cell-index={index}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="relative flex cursor-pointer items-center justify-center overflow-hidden bg-paper/40 select-none"
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
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/70 backdrop-blur-[1px]">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-ink/20 border-t-ink" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
