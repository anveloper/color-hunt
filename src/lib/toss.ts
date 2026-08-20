import {
  Device,
  File as TossFile,
  type PermissionDialogResult,
  type PermissionStatus,
} from "@apps-in-toss/web-framework";

// SDK는 import만으로는 부수효과가 없고, 브릿지는 첫 호출 시점에 초기화된다.
// 따라서 웹 빌드에서도 정적 import 자체는 안전하다.

/**
 * 앱인토스 웹뷰 안에서 실행 중인지 판정한다.
 * SDK 내부(assertWebViewEnvironment)와 동일한 기준을 쓴다.
 */
export function isInToss(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView != null
  );
}

/** 권한이 허용 상태가 되도록 시도한다. 거부되면 false. */
async function ensurePermission(fn: {
  getPermission: () => Promise<PermissionStatus>;
  openPermissionDialog: () => Promise<PermissionDialogResult>;
}): Promise<boolean> {
  const status = await fn.getPermission();
  if (status === "allowed") return true;
  // 거부 상태여도 다이얼로그를 띄워 설정으로 유도할 수 있다.
  return (await fn.openPermissionDialog()) === "allowed";
}

/**
 * 토스 앨범에서 사진을 골라 data URL 배열로 돌려준다.
 * 취소하거나 권한이 없으면 빈 배열 — 호출 측은 평소대로 계속 동작해야 한다.
 */
export async function pickPhotos(maxCount: number): Promise<string[]> {
  if (!(await ensurePermission(Device.getPhotos))) return [];
  const photos = await Device.getPhotos({
    base64: true,
    maxCount,
    maxWidth: 1200,
  });
  return photos.map((p) => p.dataUri);
}

/** File.saveBase64를 쓸 수 있는 토스앱 버전인지. */
export function canSaveToDevice(): boolean {
  return isInToss() && TossFile.saveBase64.isSupported();
}

/**
 * data URL을 기기에 파일로 저장한다.
 * saveBase64는 접두사 없는 순수 base64 문자열을 받는다.
 */
export async function saveDataUrlToDevice(
  dataUrl: string,
  fileName: string,
): Promise<void> {
  const match = /^data:([^;,]+)(?:;[^,]*)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("data URL 형식이 아닙니다");
  const [, mimeType, data] = match;
  await TossFile.saveBase64({ data, fileName, mimeType });
}
