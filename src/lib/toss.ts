import {
  Device,
  FetchAlbumPhotosPermissionError,
  OpenCameraPermissionError,
  File as TossFile,
  type PermissionDialogResult,
  type PermissionStatus,
} from "@apps-in-toss/web-framework";

// SDK는 import만으로는 부수효과가 없고, 브릿지는 첫 호출 시점에 초기화된다.
// 따라서 웹 빌드에서도 정적 import 자체는 안전하다.
// isInToss는 env.ts에 따로 두어, 판정 하나 때문에 SDK가 끌려오지 않게 한다.

import { isInToss } from "./env";

export { isInToss };

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

// 브릿지로 오가는 base64 payload를 억제하기 위한 상한.
// 1080px 그리드에서 셀 하나는 360px(3열)~540px(2열)이라 원본이 클 이유가 없다.
// 크게 잡으면 여러 장을 한 번에 받을 때 웹뷰가 메모리로 죽는다.
const PICK_MAX_WIDTH = 720;
const PICK_MAX_COUNT = 9;

/**
 * 토스 앨범에서 사진을 골라 data URL 배열로 돌려준다.
 * 취소하거나 권한이 없으면 빈 배열 — 호출 측은 평소대로 계속 동작해야 한다.
 */
export async function pickPhotos(maxCount: number): Promise<string[]> {
  if (!(await ensurePermission(Device.getPhotos))) return [];
  let photos;
  try {
    photos = await Device.getPhotos({
      base64: true,
      maxCount: Math.max(1, Math.min(maxCount, PICK_MAX_COUNT)),
      maxWidth: PICK_MAX_WIDTH,
    });
  } catch (err) {
    if (err instanceof FetchAlbumPhotosPermissionError) return [];
    throw err;
  }
  // base64: true면 dataUri는 접두사가 없는 순수 base64 문자열이다.
  // 그대로 img.src에 넣으면 거대한 상대 URL로 요청이 나가 웹뷰가 죽는다.
  return photos.map((p) =>
    p.dataUri.startsWith("data:")
      ? p.dataUri
      : `data:image/jpeg;base64,${p.dataUri}`,
  );
}

/**
 * 토스 카메라로 한 장 촬영해 data URL로 돌려준다.
 * 취소하거나 권한이 없으면 null — 호출 측은 평소대로 계속 동작해야 한다.
 */
export async function takePhoto(): Promise<string | null> {
  if (!(await ensurePermission(Device.openCamera))) return null;
  let photo;
  try {
    photo = await Device.openCamera({
      base64: true,
      maxWidth: PICK_MAX_WIDTH,
    });
  } catch (err) {
    if (err instanceof OpenCameraPermissionError) return null;
    throw err;
  }
  if (photo?.dataUri == null) return null;
  // getPhotos와 마찬가지로 base64: true면 접두사가 없다.
  return photo.dataUri.startsWith("data:")
    ? photo.dataUri
    : `data:image/jpeg;base64,${photo.dataUri}`;
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
