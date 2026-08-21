import { Accuracy, Device } from "@apps-in-toss/web-framework";
import { isInToss } from "./toss";

export type TrackPoint = {
  lat: number;
  lng: number;
  /** epoch ms */
  t: number;
};

type Subscriber = {
  onPoint: (p: TrackPoint) => void;
  onError: (err: unknown) => void;
};

/** 위치 권한을 확보한다. 거부되면 false — 호출 측은 나머지 기능을 계속 굴려야 한다. */
export async function ensureLocationPermission(): Promise<boolean> {
  if (!isInToss()) return true; // 웹은 watchPosition이 직접 권한을 묻는다
  const status = await Device.subscribeLocation.getPermission();
  if (status === "allowed") return true;
  return (await Device.subscribeLocation.openPermissionDialog()) === "allowed";
}

/**
 * 위치 변화를 구독한다. 반환값을 호출하면 구독이 끊긴다.
 *
 * 앱인토스에서는 Device.subscribeLocation을, 웹에서는 navigator.geolocation을 쓴다.
 * 웹에서도 동작해야 color-hunt.run에서 기능을 확인할 수 있다.
 */
export function subscribeTrack({ onPoint, onError }: Subscriber): () => void {
  if (isInToss()) {
    return Device.subscribeLocation({
      options: {
        accuracy: Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      onEvent: (loc) =>
        onPoint({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          t: loc.timestamp,
        }),
      onError,
    });
  }

  if (typeof navigator === "undefined" || navigator.geolocation == null) {
    onError(new Error("이 환경에서는 위치를 사용할 수 없습니다"));
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        t: pos.timestamp,
      }),
    onError,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
