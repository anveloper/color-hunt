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

export type AppState = {
  layout: Layout;
  gridLineMode: GridLineMode;
  cells: CellState[];
  overflowCells: CellState[];
};
