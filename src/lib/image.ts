const MAX_DIM = 1200;
const QUALITY = 0.85;

const HEIC_MIME = /^image\/(heic|heif)/i;
const HEIC_EXT = /\.(heic|heif)$/i;

function isHeic(file: File): boolean {
  return HEIC_MIME.test(file.type) || HEIC_EXT.test(file.name);
}

// HEIC는 PC 브라우저(Chrome/Firefox/Edge)에서 디코딩이 안 되므로
// 업로드 시점에 JPEG로 변환. heic-to는 더 최신 libheif를 따라가므로
// 최근 iPhone HEIC(iOS 18 계열) 대응이 heic2any보다 안정적이다.
async function ensureDecodableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  // 미니앱 빌드에서는 이 분기 전체가 죽은 코드가 되어 heic-to가 빠진다.
  if (!__HEIC_ENABLED__) {
    throw new Error("이 환경에서는 HEIC 파일을 변환할 수 없습니다.");
  }
  try {
    const { heicTo } = await import("heic-to");
    const out = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.92,
    });
    if (out instanceof Blob) return out;
    throw new Error("HEIC conversion returned unexpected result");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `HEIC 파일을 브라우저에서 변환하지 못했습니다. 최신 iPhone HEIC이거나 현재 변환기가 지원하지 않는 포맷일 수 있습니다. (${message})`,
    );
  }
}

/**
 * 업로드 소스를 리사이즈된 JPEG data URL로 정규화한다.
 * `File`은 웹 파일 피커 경로, `string`(data URL)은 앱인토스 앨범/카메라 경로다.
 */
export async function resizeToDataUrl(source: File | string): Promise<string> {
  if (typeof source === "string") return resizeFromUrl(source);
  const blob = await ensureDecodableBlob(source);
  const url = URL.createObjectURL(blob);
  try {
    return await resizeFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function resizeFromUrl(url: string): Promise<string> {
  const img = await loadImage(url);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e instanceof Event ? new Error("image load failed") : e);
    img.src = src;
  });
}
