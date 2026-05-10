import type { Transform } from "../types";

export const IDENTITY_TRANSFORM: Transform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export function getTransform(t: Transform | undefined): Transform {
  return t ?? IDENTITY_TRANSFORM;
}

export function transformCss(t: Transform): string {
  const tx = (t.offsetX * 100).toFixed(3);
  const ty = (t.offsetY * 100).toFixed(3);
  return `translate(${tx}%, ${ty}%) rotate(${t.rotation}deg) scale(${t.scale})`;
}

export const SCALE_BOUNDS = { min: 0.5, max: 5 };
