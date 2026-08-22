import { useEffect, useMemo, useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import type {
  AppState,
  OverlayAsset,
  OverlayEmphasis,
  OverlayKind,
  Transform,
} from "../types";
import { SCALE_BOUNDS } from "../lib/transform";
import {
  COURSE_MARK,
  EMPHASIS_STYLE,
  formatDuration,
  normalizeTrack,
  runDurationMs,
} from "../lib/overlay";
import { findHuntColor } from "../lib/palette";

type Props = {
  state: AppState;
  now: number;
  selected: OverlayKind | null;
  onSelect: (kind: OverlayKind | null) => void;
  onChange: (next: OverlayAsset[]) => void;
  onCycleEmphasis: (kind: OverlayKind) => void;
};

/**
 * 콜라주 위에 얹는 요소들.
 *
 * 한 번에 하나만 선택되고, 제스처는 레이어 전체에서 받아 선택된 요소에만
 * 적용한다. 요소별로 제스처를 걸면 경로 SVG(180px)가 텍스트 위를 덮어
 * 핀치의 두 번째 손가락을 가로채고, 두 손가락으로 서로 다른 요소가
 * 동시에 움직이는 문제가 생긴다.
 */
export default function OverlayLayer({
  state,
  now,
  selected,
  onSelect,
  onChange,
  onCycleEmphasis,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const track = useMemo(() => normalizeTrack(state.run), [state.run]);
  const color = findHuntColor(state.huntColor);
  const duration = runDurationMs(state.run, now);

  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setFrameSize({ w: r.width, h: r.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selectedAsset =
    state.overlays.find((o) => o.kind === selected && o.visible) ?? null;

  // 제스처 중에는 로컬 상태로만 갱신하고, 끝날 때 한 번만 올린다.
  // 매 프레임 앱 상태를 갱신하면 base64 사진이 통째로 든 state가
  // LocalStorage에 계속 다시 쓰인다.
  const [liveT, setLiveT] = useState<Transform | null>(null);
  const liveRef = useRef<Transform | null>(null);
  liveRef.current = liveT;

  const baseT = selectedAsset?.transform ?? null;

  // 선택이 바뀌면 이전 요소의 제스처 중간값을 버린다.
  // 남겨두면 다음 요소가 그 값으로 그려지고 그대로 저장된다.
  useEffect(() => {
    setLiveT(null);
  }, [selected]);
  const activeT = liveT ?? baseT;

  const commit = (t: Transform) => {
    if (selected == null) {
      setLiveT(null);
      return;
    }
    onChange(
      state.overlays.map((o) => (o.kind === selected ? { ...o, transform: t } : o)),
    );
    setLiveT(null);
  };

  const current = () => liveRef.current ?? baseT;

  /**
   * drag와 pinch는 같은 tick에 함께 들어온다. 스프레드로 덮어쓰면 나중에
   * 실행된 쪽이 앞의 기여를 통째로 버리고, 버려진 이동량이 last 시점에
   * 한꺼번에 반영돼 요소가 튄다. 함수형 갱신으로 둘 다 누적시킨다.
   */
  const applyT = (patch: Partial<Transform>, last: boolean) => {
    setLiveT((cur) => {
      const base = cur ?? baseT;
      if (base == null) return cur;
      const next = { ...base, ...patch };
      if (last) {
        // commit이 setLiveT(null)을 부르므로 여기서는 값을 올리기만 한다.
        queueMicrotask(() => commit(next));
      }
      return next;
    });
  };

  useGesture(
    {
      onPinch: ({ offset: [scale, angle], last }) => {
        if (baseT == null) return;
        applyT({ scale, rotation: angle }, last);
      },
      onDrag: ({ offset: [px, py], last }) => {
        if (baseT == null || frameSize.w === 0 || frameSize.h === 0) return;
        applyT({ offsetX: px / frameSize.w, offsetY: py / frameSize.h }, last);
      },
      onWheel: ({ event, delta: [, dy], last }) => {
        event.preventDefault();
        const cur = current();
        if (cur == null) return;
        const factor = Math.exp(-dy * 0.0015);
        applyT(
          {
            scale: Math.min(
              SCALE_BOUNDS.max,
              Math.max(SCALE_BOUNDS.min, cur.scale * factor),
            ),
          },
          last,
        );
      },
    },
    {
      target: layerRef,
      enabled: selectedAsset != null,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: SCALE_BOUNDS,
        rubberband: true,
        from: () => {
          const cur = current();
          return cur ? [cur.scale, cur.rotation] : [1, 0];
        },
      },
      drag: {
        filterTaps: true,
        from: () => {
          const cur = current();
          if (cur == null || frameSize.w === 0) return [0, 0];
          return [cur.offsetX * frameSize.w, cur.offsetY * frameSize.h];
        },
      },
    },
  );

  // 선택된 요소는 pointerEvents: none이라 자기 onClick이 안 온다.
  // 클릭 좌표가 그 요소 안인지로 판정한다.
  const selectedElRef = useRef<HTMLDivElement | null>(null);

  // 다른(선택되지 않은) 요소가 자기 onClick으로 선택을 가져갔으면
  // 이번 클릭은 거기서 끝난다. 안 그러면 한 번의 탭으로 선택이 옮겨가면서
  // 직전 요소의 강조 스타일까지 바뀐다.
  const claimedRef = useRef(false);

  const handleLayerClick = (e: React.MouseEvent) => {
    if (claimedRef.current) {
      claimedRef.current = false;
      return;
    }
    const el = selectedElRef.current;
    if (el != null && selected != null) {
      const r = el.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (inside) {
        onCycleEmphasis(selected);
        return;
      }
    }
    if (e.target === e.currentTarget) onSelect(null);
  };

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 z-30 overflow-hidden"
      style={{ touchAction: "none" }}
      onClick={handleLayerClick}
    >
      {state.overlays.map((asset) => {
        if (!asset.visible) return null;
        if (asset.kind === "course" && track == null) return null;
        if (asset.kind === "runtime" && state.run == null) return null;

        const isSelected = asset.kind === selected;
        const t = isSelected && activeT != null ? activeT : asset.transform;

        return (
          <div
            key={asset.kind}
            ref={isSelected ? selectedElRef : undefined}
            onClick={() => {
              claimedRef.current = true;
              onSelect(asset.kind);
            }}
            className="absolute top-1/2 left-1/2 p-4 text-paper select-none"
            style={{
              // 선택된 요소는 레이어가 제스처를 받으므로 스스로는 통과시킨다.
              // 그래야 경로 위에서 시작한 핀치도 정상 동작한다.
              pointerEvents: isSelected ? "none" : "auto",
              transformOrigin: "center center",
              transform: `translate(-50%, -50%) translate(${(t.offsetX * frameSize.w).toFixed(3)}px, ${(t.offsetY * frameSize.h).toFixed(3)}px) rotate(${t.rotation}deg) scale(${t.scale})`,
              willChange: "transform",
            }}
          >
            <div
              className={
                (asset.emphasis === "plate"
                  ? "rounded-2xl bg-ink/60 px-3 py-1.5 backdrop-blur-[2px] "
                  : "") +
                (isSelected
                  ? "rounded-2xl outline-2 outline-dashed outline-paper/70 outline-offset-4"
                  : "")
              }
            >
              {asset.kind === "course" && track != null && (
                <CourseMark
                  track={track}
                  hex={color.hex}
                  emphasis={asset.emphasis}
                />
              )}
              {asset.kind === "runtime" && (
                <span
                  className="text-2xl font-bold"
                  style={textStyle(asset.emphasis)}
                >
                  {formatDuration(duration)}
                </span>
              )}
              {asset.kind === "color" && (
                <span
                  className="flex items-center gap-1.5 text-lg font-bold"
                  style={textStyle(asset.emphasis)}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 사진 위에서 글자가 묻히지 않게 하는 세 방식. compose.ts와 규약을 맞춘다. */
const OUTLINE_SHADOW = [
  `1px 1px 0 ${EMPHASIS_STYLE.OUTLINE_COLOR}`,
  `-1px 1px 0 ${EMPHASIS_STYLE.OUTLINE_COLOR}`,
  `1px -1px 0 ${EMPHASIS_STYLE.OUTLINE_COLOR}`,
  `-1px -1px 0 ${EMPHASIS_STYLE.OUTLINE_COLOR}`,
  "0 0 3px rgba(0,0,0,0.6)",
].join(", ");

function textStyle(emphasis: OverlayEmphasis): React.CSSProperties {
  if (emphasis === "outline") return { textShadow: OUTLINE_SHADOW };
  if (emphasis === "plate") return {};
  return { textShadow: `0 1px 2px ${EMPHASIS_STYLE.SHADOW_COLOR}` };
}

function CourseMark({
  track,
  hex,
  emphasis,
}: {
  track: NonNullable<ReturnType<typeof normalizeTrack>>;
  hex: string;
  emphasis: OverlayEmphasis;
}) {
  const d = track.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(4)},${p.y.toFixed(4)}`)
    .join(" ");

  return (
    <svg
      width={COURSE_MARK.PX}
      height={COURSE_MARK.PX}
      viewBox={`${COURSE_MARK.VIEW_MIN} ${COURSE_MARK.VIEW_MIN} ${COURSE_MARK.VIEW_SPAN} ${COURSE_MARK.VIEW_SPAN}`}
      aria-hidden="true"
      style={
        emphasis === "shadow"
          ? { filter: `drop-shadow(0 1px 2px ${EMPHASIS_STYLE.SHADOW_COLOR})` }
          : undefined
      }
    >
      {emphasis === "outline" && (
        <path
          d={d}
          fill="none"
          stroke={EMPHASIS_STYLE.OUTLINE_COLOR}
          strokeWidth={COURSE_MARK.OUTLINE_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={hex}
        strokeWidth={COURSE_MARK.STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {track.spots.map((s) => (
        <circle
          key={s.cellIndex}
          cx={s.x}
          cy={s.y}
          r={COURSE_MARK.SPOT_R}
          fill={hex}
          stroke="#ffffff"
          strokeWidth={COURSE_MARK.SPOT_STROKE}
        />
      ))}
    </svg>
  );
}
