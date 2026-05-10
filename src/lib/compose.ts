import type { AppState } from "../types";
import { LAYOUT_DIMS } from "./layout-utils";
import { loadImage } from "./image";
import { getTransform } from "./transform";

const BASE_DIM = 1080;
const PAPER_BG = "#f6f1e3";

type ComposeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ComposeSnapshot = {
  frame: { w: number; h: number };
  cells: ComposeRect[];
};

export async function composeAndDownload(
  state: AppState,
  frameAspect: { w: number; h: number },
  snapshot?: ComposeSnapshot,
): Promise<void> {
  const { cols, rows } = LAYOUT_DIMS[state.layout];

  // 짧은 변을 1080으로 맞춰 가로/세로 모두 충분한 해상도 확보
  const isPortrait = frameAspect.h >= frameAspect.w;
  const targetWidth = isPortrait
    ? BASE_DIM
    : Math.round((BASE_DIM * frameAspect.w) / frameAspect.h);
  const targetHeight = isPortrait
    ? Math.round((BASE_DIM * frameAspect.h) / frameAspect.w)
    : BASE_DIM;

  const cellW = targetWidth / cols;
  const cellH = targetHeight / rows;
  const scaleX = targetWidth / frameAspect.w;
  const scaleY = targetHeight / frameAspect.h;

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
      const rect = snapshot?.cells[i];
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = rect ? rect.x * scaleX : c * cellW;
      const y = rect ? rect.y * scaleY : r * cellH;
      const w = rect ? rect.w * scaleX : cellW;
      const h = rect ? rect.h * scaleY : cellH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      // CSS와 동일한 변환 순서: translate(offset) → rotate → scale, transform-origin: center.
      ctx.translate(x + w / 2 + t.offsetX * w, y + h / 2 + t.offsetY * h);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scale, t.scale);

      // 기본 cover-fit 크기 계산 후 중앙 기준으로 그리기.
      const ratio = Math.max(w / img.width, h / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

      ctx.restore();
    }),
  );

  if (state.gridLineMode !== "none") {
    ctx.strokeStyle = state.gridLineMode === "white" ? "#ffffff" : "#000000";
    ctx.lineWidth = 2;
    if (snapshot) {
      const seenVertical = new Set<number>();
      const seenHorizontal = new Set<number>();
      for (const rect of snapshot.cells) {
        const right = Math.round((rect.x + rect.w) * scaleX);
        const bottom = Math.round((rect.y + rect.h) * scaleY);
        if (right > 0 && right < targetWidth && !seenVertical.has(right)) {
          seenVertical.add(right);
          ctx.beginPath();
          ctx.moveTo(right, 0);
          ctx.lineTo(right, targetHeight);
          ctx.stroke();
        }
        if (bottom > 0 && bottom < targetHeight && !seenHorizontal.has(bottom)) {
          seenHorizontal.add(bottom);
          ctx.beginPath();
          ctx.moveTo(0, bottom);
          ctx.lineTo(targetWidth, bottom);
          ctx.stroke();
        }
      }
    } else {
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
