export type Layout = "3x3" | "3x4" | "2x3" | "1x3";
export type GridLineMode = "white" | "black" | "none";

export type CellState = {
  id: string;
  imageDataUrl?: string;
};

export type AppState = {
  layout: Layout;
  gridLineMode: GridLineMode;
  cells: CellState[];
  overflowCells: CellState[];
};
