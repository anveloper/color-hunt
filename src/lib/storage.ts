import type { AppState } from "../types";
import { LAYOUT_DIMS, makeEmptyCells } from "./layout-utils";
import { DEFAULT_HUNT_COLOR } from "./palette";
import { DEFAULT_OVERLAYS } from "./overlay";

const KEY = "colorhunt:state:v1";

export const DEFAULT_STATE: AppState = {
  layout: "3x3",
  huntColor: DEFAULT_HUNT_COLOR,
  gridLineMode: "white",
  cells: makeEmptyCells(LAYOUT_DIMS["3x3"].cols * LAYOUT_DIMS["3x3"].rows),
  overflowCells: [],
  overlays: DEFAULT_OVERLAYS,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      layout: parsed.layout ?? DEFAULT_STATE.layout,
      huntColor: parsed.huntColor ?? DEFAULT_STATE.huntColor,
      gridLineMode: parsed.gridLineMode ?? DEFAULT_STATE.gridLineMode,
      cells: parsed.cells ?? DEFAULT_STATE.cells,
      overflowCells: parsed.overflowCells ?? [],
      run: parsed.run,
      overlays: parsed.overlays ?? DEFAULT_OVERLAYS,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[colorhunt] LocalStorage write failed:", err);
  }
}

export function hasSavedWork(state: AppState): boolean {
  return [...state.cells, ...state.overflowCells].some((cell) => !!cell.imageDataUrl);
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 초기화 실패 시 무시
  }
}

const EDIT_HINT_KEY = "colorhunt:hint:edit-seen-v1";

export function isEditHintSeen(): boolean {
  try {
    return localStorage.getItem(EDIT_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markEditHintSeen(): void {
  try {
    localStorage.setItem(EDIT_HINT_KEY, "1");
  } catch {
    // 저장 실패해도 무시 — 다음 진입 때 다시 보여주는 게 최악의 경우
  }
}
