import type { AppState } from "../types";
import { LAYOUT_DIMS } from "./layout-utils";
import { loadImage } from "./image";
import { getTransform } from "./transform";
import { canSaveToDevice, saveDataUrlToDevice } from "./toss";
import { formatDuration, normalizeTrack, runDurationMs } from "./overlay";
import { findHuntColor } from "./palette";

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

  drawOverlays(ctx, state, {
    width: targetWidth,
    height: targetHeight,
    // 화면 프레임 기준 크기를 결과 해상도로 환산한다.
    // 이 배율을 안 맞추면 화면에서 본 것보다 오버레이가 작게 찍힌다.
    scale: targetWidth / frameAspect.w,
  });

  const fileName = `colorhunt-${Date.now()}.png`;

  // 앱인토스 웹뷰에서는 <a download>가 동작하지 않으므로 네이티브 저장 API를 쓴다.
  if (canSaveToDevice()) {
    await saveDataUrlToDevice(canvas.toDataURL("image/png"), fileName);
    return;
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
        a.download = fileName;
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

type OverlayCanvas = { width: number; height: number; scale: number };

/** 화면 오버레이(overlay-layer.tsx)와 같은 변환 규약으로 캔버스에 그린다. */
function drawOverlays(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  canvas: OverlayCanvas,
): void {
  const color = findHuntColor(state.huntColor);
  const track = normalizeTrack(state.run);
  const duration = runDurationMs(state.run, Date.now());

  for (const asset of state.overlays) {
    if (!asset.visible) continue;
    if (asset.kind === "course" && track == null) continue;
    if (asset.kind === "runtime" && state.run == null) continue;

    const t = asset.transform;
    ctx.save();
    // 화면과 동일: 중앙 → 비율 오프셋 → 회전 → 확대
    ctx.translate(
      canvas.width / 2 + t.offsetX * canvas.width,
      canvas.height / 2 + t.offsetY * canvas.height,
    );
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scale * canvas.scale, t.scale * canvas.scale);

    if (asset.kind === "course" && track != null) {
      drawCourse(ctx, track, color.hex);
    } else if (asset.kind === "runtime") {
      drawText(ctx, formatDuration(duration), 24);
    } else if (asset.kind === "color") {
      drawColorChip(ctx, color.name, color.hex);
    }

    ctx.restore();
  }
}

// overlay-layer.tsx의 <svg width=180 height=180 viewBox="-0.06 -0.06 1.12 1.12">와 같은 좌표계
const COURSE_PX = 180;
const COURSE_VIEW_MIN = -0.06;
const COURSE_VIEW_SPAN = 1.12;

function drawCourse(
  ctx: CanvasRenderingContext2D,
  track: NonNullable<ReturnType<typeof normalizeTrack>>,
  hex: string,
): void {
  const unit = COURSE_PX / COURSE_VIEW_SPAN;
  const toPx = (v: number) => (v - COURSE_VIEW_MIN) * unit - COURSE_PX / 2;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = hex;
  ctx.lineWidth = 0.035 * unit;

  ctx.beginPath();
  track.points.forEach((p, i) => {
    const x = toPx(p.x);
    const y = toPx(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  for (const spot of track.spots) {
    ctx.beginPath();
    ctx.arc(toPx(spot.x), toPx(spot.y), 0.045 * unit, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.lineWidth = 0.016 * unit;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, size: number): void {
  ctx.font = `bold ${size}px Gaegu, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // 사진 위에서도 읽히도록 얇은 그림자를 깐다.
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 2;
  ctx.fillStyle = "#f6f1e3";
  ctx.fillText(text, 0, 0);
  ctx.shadowColor = "transparent";
}

function drawColorChip(
  ctx: CanvasRenderingContext2D,
  name: string,
  hex: string,
): void {
  const size = 18;
  ctx.font = `bold ${size}px Gaegu, system-ui, sans-serif`;
  const chip = 16;
  const gap = 6;
  const textW = ctx.measureText(name).width;
  const total = chip + gap + textW;
  const left = -total / 2;

  ctx.beginPath();
  ctx.arc(left + chip / 2, 0, chip / 2, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 2;
  ctx.fillStyle = "#f6f1e3";
  ctx.fillText(name, left + chip + gap, 0);
  ctx.shadowColor = "transparent";
}
