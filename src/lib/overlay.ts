import type { OverlayAsset, OverlayKind, RunRecord } from "../types";
import { IDENTITY_TRANSFORM } from "./transform";

export const OVERLAY_KINDS: OverlayKind[] = ["course", "runtime", "color"];

export const OVERLAY_LABEL: Record<OverlayKind, string> = {
  course: "경로",
  runtime: "시간",
  color: "색",
};

// 기본 배치는 서로 겹치지 않게 흩어둔다. 이후엔 사용자가 자유롭게 옮긴다.
const DEFAULT_OFFSET: Record<OverlayKind, { x: number; y: number }> = {
  course: { x: 0, y: 0 },
  runtime: { x: -0.28, y: -0.38 },
  color: { x: 0.28, y: 0.38 },
};

export const DEFAULT_OVERLAYS: OverlayAsset[] = OVERLAY_KINDS.map((kind) => ({
  kind,
  visible: true,
  transform: {
    ...IDENTITY_TRANSFORM,
    offsetX: DEFAULT_OFFSET[kind].x,
    offsetY: DEFAULT_OFFSET[kind].y,
  },
}));

/** 진행 중이면 지금까지, 끝났으면 총 소요 시간(ms). */
export function runDurationMs(run: RunRecord | undefined, now: number): number {
  if (!run) return 0;
  return (run.endedAt ?? now) - run.startedAt;
}

/** 1:02:03 / 12:34 형식. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type NormalizedTrack = {
  /** 0~1 정규화 좌표. 종횡비를 유지한 채 중앙에 맞춘다. */
  points: { x: number; y: number }[];
  spots: { x: number; y: number; cellIndex: number }[];
};

/**
 * 위경도를 0~1 좌표계로 정규화한다.
 *
 * 지도 타일 없이 경로 모양만 그리는 용도다. 위도에 따라 경도 1도의 실제 거리가
 * 줄어들기 때문에 cos(위도)로 보정해야 경로가 가로로 늘어지지 않는다.
 */
export function normalizeTrack(run: RunRecord | undefined): NormalizedTrack | null {
  if (!run || run.points.length < 2) return null;

  const latRad = (run.points[0].lat * Math.PI) / 180;
  const lonScale = Math.cos(latRad) || 1;
  const project = (p: { lat: number; lng: number }) => ({
    x: p.lng * lonScale,
    y: -p.lat, // 위도는 위로 증가하지만 캔버스 y는 아래로 증가한다
  });

  const projected = run.points.map(project);
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const span = Math.max(maxX - minX, maxY - minY);
  if (span === 0) return null;

  // 종횡비 유지: 더 긴 축을 기준으로 나누고 짧은 축은 가운데로 민다.
  const padX = (span - (maxX - minX)) / 2;
  const padY = (span - (maxY - minY)) / 2;
  const to01 = (p: { x: number; y: number }) => ({
    x: (p.x - minX + padX) / span,
    y: (p.y - minY + padY) / span,
  });

  return {
    points: projected.map(to01),
    spots: run.spots.map((s) => ({
      ...to01(project(s.point)),
      cellIndex: s.cellIndex,
    })),
  };
}
