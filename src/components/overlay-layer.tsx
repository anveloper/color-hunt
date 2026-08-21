import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import type { AppState, OverlayAsset, Transform } from "../types";
import { SCALE_BOUNDS } from "../lib/transform";
import {
  formatDuration,
  normalizeTrack,
  runDurationMs,
} from "../lib/overlay";
import { findHuntColor } from "../lib/palette";

type Props = {
  state: AppState;
  now: number;
  onChange: (next: OverlayAsset[]) => void;
};

/**
 * 콜라주 위에 얹는 요소들. 각각 독립적으로 옮기고 키울 수 있다.
 *
 * 레이어 자체는 pointer-events: none이라 빈 곳을 누르면 아래 셀에 그대로
 * 전달된다. 요소 위에서만 제스처를 가져간다.
 */
export default function OverlayLayer({ state, now, onChange }: Props) {
  const track = useMemo(() => normalizeTrack(state.run), [state.run]);
  const color = findHuntColor(state.huntColor);
  const duration = runDurationMs(state.run, now);

  const update = (kind: OverlayAsset["kind"], transform: Transform) => {
    onChange(
      state.overlays.map((o) => (o.kind === kind ? { ...o, transform } : o)),
    );
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {state.overlays.map((asset) => {
        if (!asset.visible) return null;

        // 데이터가 없으면 그리지 않는다. 별도 토글 없이 자연스럽게 숨는다.
        if (asset.kind === "course" && track == null) return null;
        if (asset.kind === "runtime" && state.run == null) return null;

        return (
          <OverlayAssetView
            key={asset.kind}
            asset={asset}
            onCommit={(t) => update(asset.kind, t)}
          >
            {asset.kind === "course" && track != null && (
              <CourseMark track={track} hex={color.hex} />
            )}
            {asset.kind === "runtime" && (
              <span className="text-2xl font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                {formatDuration(duration)}
              </span>
            )}
            {asset.kind === "color" && (
              <span className="flex items-center gap-1.5 text-lg font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name}
              </span>
            )}
          </OverlayAssetView>
        );
      })}
    </div>
  );
}

function OverlayAssetView({
  asset,
  onCommit,
  children,
}: {
  asset: OverlayAsset;
  onCommit: (t: Transform) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<Transform>(asset.transform);
  const tRef = useRef(t);
  tRef.current = t;

  // offsetX/Y는 프레임 대비 비율이다. CSS translate의 %는 "요소 자신"의 크기를
  // 기준으로 하므로 그대로 넣으면 요소가 손가락보다 훨씬 적게 움직인다.
  // 셀 편집기와 같이 픽셀로 환산해서 적용한다.
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const update = () => {
      const r = parent.getBoundingClientRect();
      setFrameSize({ w: r.width, h: r.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // 마운트 시점의 t는 저장된 값 그대로라 다시 올릴 필요가 없다.
  // 그냥 두면 진입할 때마다 의미 없는 state 갱신과 LocalStorage 쓰기가 일어난다.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onCommit(t);
    // onCommit은 매 렌더 새 함수라 의존성에 넣으면 무한 루프가 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // offsetX/Y는 프레임 대비 비율. 셀 편집기와 같은 규약이다.
  const frame = () => ref.current?.parentElement?.getBoundingClientRect();

  useGesture(
    {
      onPinch: ({ offset: [scale, angle] }) =>
        setT((cur) => ({ ...cur, scale, rotation: angle })),
      onDrag: ({ offset: [px, py] }) => {
        const r = frame();
        if (!r) return;
        setT((cur) => ({
          ...cur,
          offsetX: px / r.width,
          offsetY: py / r.height,
        }));
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        setT((cur) => {
          const factor = Math.exp(-dy * 0.0015);
          return {
            ...cur,
            scale: Math.min(
              SCALE_BOUNDS.max,
              Math.max(SCALE_BOUNDS.min, cur.scale * factor),
            ),
          };
        });
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: SCALE_BOUNDS,
        rubberband: true,
        from: () => [tRef.current.scale, tRef.current.rotation],
      },
      drag: {
        from: () => {
          const r = frame();
          if (!r) return [0, 0];
          return [
            tRef.current.offsetX * r.width,
            tRef.current.offsetY * r.height,
          ];
        },
      },
    },
  );

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute top-1/2 left-1/2 text-paper select-none"
      style={{
        touchAction: "none",
        transformOrigin: "center center",
        // 중앙 기준 배치 후 오프셋 → 회전 → 확대.
        // 오프셋은 프레임 픽셀로 환산해야 손가락과 1:1로 움직인다.
        transform: `translate(-50%, -50%) translate(${(t.offsetX * frameSize.w).toFixed(3)}px, ${(t.offsetY * frameSize.h).toFixed(3)}px) rotate(${t.rotation}deg) scale(${t.scale})`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

function CourseMark({
  track,
  hex,
}: {
  track: NonNullable<ReturnType<typeof normalizeTrack>>;
  hex: string;
}) {
  const d = track.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(4)},${p.y.toFixed(4)}`)
    .join(" ");

  return (
    <svg
      width="180"
      height="180"
      viewBox="-0.06 -0.06 1.12 1.12"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))" }}
    >
      <path
        d={d}
        fill="none"
        stroke={hex}
        strokeWidth={0.035}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {track.spots.map((s) => (
        <circle
          key={s.cellIndex}
          cx={s.x}
          cy={s.y}
          r={0.045}
          fill={hex}
          stroke="#ffffff"
          strokeWidth={0.016}
        />
      ))}
    </svg>
  );
}
