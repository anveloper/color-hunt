export type HuntColor = {
  id: string;
  name: string;
  hex: string;
};

/**
 * 오늘의 색 후보.
 * 앱의 색연필 팔레트(styles/index.css의 --color-pencil-*)와 같은 값을 쓴다.
 * 실제로 거리에서 찾을 수 있어야 하므로 서로 충분히 구분되는 색만 둔다.
 */
export const HUNT_COLORS: HuntColor[] = [
  { id: "red", name: "빨강", hex: "#d9534f" },
  { id: "orange", name: "주황", hex: "#e89b5a" },
  { id: "yellow", name: "노랑", hex: "#e8c547" },
  { id: "green", name: "초록", hex: "#6aa84f" },
  { id: "teal", name: "청록", hex: "#3fa9a0" },
  { id: "blue", name: "파랑", hex: "#5c6bc0" },
  { id: "purple", name: "보라", hex: "#8e6ab0" },
];

export const DEFAULT_HUNT_COLOR = HUNT_COLORS[0].id;

export function findHuntColor(id: string): HuntColor {
  return HUNT_COLORS.find((c) => c.id === id) ?? HUNT_COLORS[0];
}

/** 무작위로 하나 고른다. `exclude`와는 반드시 다른 색이 나온다. */
export function randomHuntColor(exclude?: string): HuntColor {
  const pool = HUNT_COLORS.filter((c) => c.id !== exclude);
  const candidates = pool.length > 0 ? pool : HUNT_COLORS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
