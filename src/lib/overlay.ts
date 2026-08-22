import type {
  OverlayAsset,
  OverlayEmphasis,
  OverlayKind,
  RunRecord,
  Transform,
} from "../types";
import { IDENTITY_TRANSFORM } from "./transform";

export const OVERLAY_KINDS: OverlayKind[] = ["course", "runtime", "color"];

export const OVERLAY_LABEL: Record<OverlayKind, string> = {
  course: "경로",
  runtime: "시간",
  color: "색",
};

// 기본 배치는 서로 겹치지 않게 세로로 흩어둔다. 이후엔 사용자가 자유롭게 옮긴다.
//
// 오프셋은 프레임 크기 대비 비율이고 화면 하단 약 10%는 독이 차지한다.
// y를 0.34보다 크게 잡으면 요소가 독(z-50) 뒤로 들어가 보이지도, 잡히지도 않는다.
const DEFAULT_OFFSET: Record<OverlayKind, { x: number; y: number }> = {
  course: { x: 0, y: 0 },
  runtime: { x: 0, y: -0.34 },
  color: { x: 0, y: 0.3 },
};

/**
 * 드래그 오프셋을 %로 해석하던 시절의 기본값.
 *
 * 그때는 %가 "요소 자신"의 크기 기준이라 실제로는 몇 px밖에 안 움직였고,
 * 그 전제로 큰 값을 넣어뒀다. px로 바로잡은 뒤로는 같은 값이 프레임의
 * 38%가 되어 색 요소가 독 뒤로 숨는다. 저장된 값이 손대지 않은
 * 기본값과 같을 때만 새 기본값으로 옮긴다.
 */
const LEGACY_DEFAULT_OFFSET: Record<OverlayKind, { x: number; y: number }> = {
  course: { x: 0, y: 0 },
  runtime: { x: -0.28, y: -0.38 },
  color: { x: 0.28, y: 0.38 },
};

export function migrateOverlays(overlays: OverlayAsset[]): OverlayAsset[] {
  return overlays.map((raw) => {
    // emphasis는 나중에 생긴 필드라 구버전 저장값에는 없다.
    const o: OverlayAsset = { ...raw, emphasis: raw.emphasis ?? "shadow" };
    const legacy = LEGACY_DEFAULT_OFFSET[o.kind];
    const next = DEFAULT_OFFSET[o.kind];
    if (legacy == null || next == null) return o;
    const untouched =
      o.transform.offsetX === legacy.x &&
      o.transform.offsetY === legacy.y &&
      o.transform.scale === 1 &&
      o.transform.rotation === 0;
    if (!untouched) return o; // 사용자가 옮긴 건 건드리지 않는다
    return {
      ...o,
      transform: { ...o.transform, offsetX: next.x, offsetY: next.y },
    };
  });
}

/** 해당 요소의 기본 배치. 껐다 켤 때 여기로 되돌린다. */
export function defaultOverlayTransform(kind: OverlayKind): Transform {
  return {
    ...IDENTITY_TRANSFORM,
    offsetX: DEFAULT_OFFSET[kind].x,
    offsetY: DEFAULT_OFFSET[kind].y,
  };
}

export const EMPHASIS_CYCLE: Record<OverlayEmphasis, OverlayEmphasis> = {
  shadow: "outline",
  outline: "plate",
  plate: "shadow",
};

export const DEFAULT_OVERLAYS: OverlayAsset[] = OVERLAY_KINDS.map((kind) => ({
  kind,
  visible: true,
  emphasis: "shadow",
  transform: defaultOverlayTransform(kind),
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

/**
 * 경로 마크의 좌표계.
 *
 * 화면(overlay-layer.tsx의 SVG)과 저장물(compose.ts의 캔버스)이 반드시
 * 같은 값을 써야 한다. 한쪽만 고치면 화면에서 배치한 것과 저장된 이미지가
 * 어긋난다. SVG는 viewBox="{VIEW_MIN} {VIEW_MIN} {VIEW_SPAN} {VIEW_SPAN}",
 * 캔버스는 unit = PX / VIEW_SPAN으로 환산해 쓴다.
 */
export const COURSE_MARK = {
  /** 렌더 크기(px). scale 1일 때의 한 변 */
  PX: 180,
  /** 0~1 정규화 좌표 바깥으로 두는 여백 — 선 굵기가 잘리지 않게 */
  VIEW_MIN: -0.06,
  VIEW_SPAN: 1.12,
  /** 정규화 좌표계 기준 굵기·반지름 */
  STROKE: 0.035,
  OUTLINE_STROKE: 0.055,
  SPOT_R: 0.045,
  SPOT_STROKE: 0.016,
} as const;

/** 사진 위에서 묻히지 않게 하는 처리. 화면과 저장물이 같은 값을 쓴다. */
export const EMPHASIS_STYLE = {
  SHADOW_COLOR: "rgba(0,0,0,0.45)",
  OUTLINE_COLOR: "rgba(0,0,0,0.85)",
  /** 판 배경 — --color-ink #2b2a26 의 60% */
  PLATE_BG: "rgba(43,42,38,0.6)",
  TEXT_COLOR: "#f6f1e3",
} as const;

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

  // 제자리에 서 있어도 GPS는 매번 조금씩 다른 좌표를 준다. span을 그대로
  // 쓰면 반경 몇 m의 측정 노이즈가 0~1 박스를 꽉 채워, 실제로 움직이지
  // 않은 사용자가 그럴듯한 경로 그림을 받게 된다. 위도 1도 ≈ 111km이므로
  // 아래 값은 약 30m에 해당한다. 그보다 좁게 움직였으면 경로로 보지 않는다.
  const MIN_SPAN_DEG = 30 / 111_000;
  if (span < MIN_SPAN_DEG) return null;

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
