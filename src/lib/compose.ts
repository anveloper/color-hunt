import type { AppState } from "../types";
import { LAYOUT_DIMS } from "./layout-utils";
import { loadImage } from "./image";
import { getTransform } from "./transform";

const TARGET_WIDTH = 1080;
const PAPER_BG = "#f6f1e3";

export async function composeAndDownload(
  state: AppState,
  frameAspect: { w: number; h: number },
): Promise<void> {
  const { cols, rows } = LAYOUT_DIMS[state.layout];
  const targetWidth = TARGET_WIDTH;
  const targetHeight = Math.round((TARGET_WIDTH * frameAspect.h) / frameAspect.w);

  const cellW = targetWidth / cols;
  const cellH = targetHeight / rows;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  ctx.fillStyle = PAPER_BG;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  await Promise.all(
    state.cells.map(async (cell, i) => {
      if (!cell.imageDataUrl) return;
      const img = await loadImage(cell.imageDataUrl);
      const t = getTransform(cell.transform);
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = c * cellW;
      const y = r * cellH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellW, cellH);
      ctx.clip();

      // CSS와 동일한 변환 순서: translate(offset) → rotate → scale, transform-origin: center.
      ctx.translate(x + cellW / 2 + t.offsetX * cellW, y + cellH / 2 + t.offsetY * cellH);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scale, t.scale);

      // 기본 cover-fit 크기 계산 후 중앙 기준으로 그리기.
      const ratio = Math.max(cellW / img.width, cellH / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

      ctx.restore();
    }),
  );

  if (state.gridLineMode !== "none") {
    ctx.strokeStyle = state.gridLineMode === "white" ? "#ffffff" : "#000000";
    ctx.lineWidth = 2;
    for (let i = 1; i < cols; i++) {
      const x = i * cellW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, targetHeight);
      ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      const y = i * cellH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(targetWidth, y);
      ctx.stroke();
    }
  }

  await new Promise<void>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `colorhunt-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      },
      "image/png",
    );
  });
}
