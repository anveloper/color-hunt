import type { AppState, CellState, Layout } from "../types";

export const LAYOUTS: Layout[] = ["3x3", "3x4", "2x3", "1x3"];

export const LAYOUT_DIMS: Record<Layout, { cols: number; rows: number }> = {
  "3x3": { cols: 3, rows: 3 },
  "3x4": { cols: 3, rows: 4 },
  "2x3": { cols: 2, rows: 3 },
  "1x3": { cols: 1, rows: 3 },
};

export function cellCount(layout: Layout): number {
  const { cols, rows } = LAYOUT_DIMS[layout];
  return cols * rows;
}

export function nextLayout(cur: Layout): Layout {
  const i = LAYOUTS.indexOf(cur);
  return LAYOUTS[(i + 1) % LAYOUTS.length];
}

let idSeed = 0;
function makeId(): string {
  idSeed += 1;
  return `c-${Date.now().toString(36)}-${idSeed.toString(36)}`;
}

export function makeEmptyCells(n: number): CellState[] {
  return Array.from({ length: n }, () => ({ id: makeId() }));
}

export function applyLayoutChange(state: AppState, newLayout: Layout): AppState {
  const target = cellCount(newLayout);
  const merged = [...state.cells, ...state.overflowCells];
  const cells = merged.slice(0, target);
  while (cells.length < target) cells.push({ id: makeId() });
  const overflowCells = merged.slice(target);
  return { ...state, layout: newLayout, cells, overflowCells };
}
