import type { TrackPoint } from "./lib/location";

export type Layout = "3x3" | "3x4" | "2x3" | "2x2" | "1x3";
export type GridLineMode = "white" | "black" | "none";

export type Transform = {
  scale: number;     // 1.0 = cover-fit
  offsetX: number;   // 셀 너비 대비 비율 (-1 ~ +1, 0 = center)
  offsetY: number;   // 셀 높이 대비 비율
  rotation: number;  // degrees
};

export type CellState = {
  id: string;
  imageDataUrl?: string;
  transform?: Transform;
};

/** 콜라주 위에 얹는 요소. 각각 사용자가 자유롭게 옮기고 키울 수 있다. */
export type OverlayKind = "course" | "runtime" | "color";

export type OverlayAsset = {
  kind: OverlayKind;
  visible: boolean;
  /** 셀 이미지와 동일한 변환 규약 — 프레임 대비 비율 오프셋 */
  transform: Transform;
};

/** 한 번의 런 기록. 좌표는 기기 밖으로 나가지 않는다. */
export type RunRecord = {
  startedAt: number;
  /** 진행 중이면 undefined */
  endedAt?: number;
  points: TrackPoint[];
  /** 사진을 넣은 지점 — 어느 셀이었는지 함께 남긴다 */
  spots: { cellIndex: number; point: TrackPoint }[];
};

export type AppState = {
  layout: Layout;
  /** 오늘의 색 (palette.ts의 HuntColor id) */
  huntColor: string;
  gridLineMode: GridLineMode;
  cells: CellState[];
  overflowCells: CellState[];
  run?: RunRecord;
  overlays: OverlayAsset[];
};
