import { useEffect, useRef, useState } from "react";
import type { TrackPoint } from "../lib/location";
import { subscribeTrack } from "../lib/location";

/**
 * 런이 진행 중일 때만 위치를 구독한다.
 *
 * onPoint는 매 렌더마다 새 함수가 오기 쉬운데 그대로 의존성에 넣으면
 * 구독이 매번 끊겼다 붙는다. ref로 최신 콜백만 갈아끼운다.
 */
export function useRunTracker(
  running: boolean,
  onPoint: (p: TrackPoint) => void,
) {
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;

  useEffect(() => {
    if (!running) return;
    return subscribeTrack({
      onPoint: (p) => onPointRef.current(p),
      onError: (err) => {
        // 권한 거부·신호 없음. 기록만 멈추고 나머지 기능은 그대로 둔다.
        console.error("[colorhunt] location track failed:", err);
      },
    });
  }, [running]);
}

/** 진행 중일 때 1초마다 리렌더해서 경과 시간을 갱신한다. */
export function useTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
