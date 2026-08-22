import type { AppState } from "../types";
import { LAYOUT_DIMS, makeEmptyCells } from "./layout-utils";
import { DEFAULT_HUNT_COLOR } from "./palette";
import { DEFAULT_OVERLAYS, MAX_RUN_MS, migrateOverlays } from "./overlay";

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
      // 앱을 닫으면 endedAt이 찍히지 않는다. 상한을 넘긴 런은 끝난 것으로
      // 보고 닫아, 재진입 시 좌표가 계속 쌓이지 않게 한다.
      run:
        parsed.run != null &&
        parsed.run.endedAt == null &&
        Date.now() - parsed.run.startedAt > MAX_RUN_MS
          ? { ...parsed.run, endedAt: parsed.run.startedAt + MAX_RUN_MS }
          : parsed.run,
      overlays: migrateOverlays(parsed.overlays ?? DEFAULT_OVERLAYS),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/** 저장 실패 시 호출된다. 사용자에게 알려야 사진이 조용히 사라지지 않는다. */
let onSaveError: ((err: unknown) => void) | null = null;

export function setSaveErrorHandler(fn: ((err: unknown) => void) | null): void {
  onSaveError = fn;
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    // 대부분 QuotaExceededError다. LocalStorage 한도(보통 5MB)에 닿으면
    // 이후 변경이 전혀 저장되지 않는데, 조용히 넘기면 사용자는 다음 진입에서
    // 마지막으로 성공한 시점으로 되돌아간 걸 보게 된다.
    console.warn("[colorhunt] LocalStorage write failed:", err);
    onSaveError?.(err);
    return false;
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

const DECORATE_HINT_KEY = "colorhunt:hint:decorate-seen-v1";

export function isDecorateHintSeen(): boolean {
  try {
    return localStorage.getItem(DECORATE_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDecorateHintSeen(): void {
  try {
    localStorage.setItem(DECORATE_HINT_KEY, "1");
  } catch {
    // 저장 실패해도 무시 — 다음 진입 때 다시 보여주는 게 최악의 경우
  }
}

/**
 * 저장된 상태의 일부만 바꾼다.
 *
 * 온보딩에서 색 칩을 누를 때마다 전체 상태(사진 base64 포함, 수 MB)를
 * parse -> 새 객체 -> stringify 하고 있었다. 색 7개를 훑으면 7회 반복된다.
 */
export function patchState(patch: Partial<AppState>): void {
  saveState({ ...loadState(), ...patch });
}
