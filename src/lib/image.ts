const MAX_DIM = 1200;
const QUALITY = 0.85;

const HEIC_MIME = /^image\/(heic|heif)/i;
const HEIC_EXT = /\.(heic|heif)$/i;

function isHeic(file: File): boolean {
  return HEIC_MIME.test(file.type) || HEIC_EXT.test(file.name);
}

// HEIC는 PC 브라우저(Chrome/Firefox/Edge)에서 디코딩이 안 되므로
// 업로드 시점에 JPEG로 변환. heic2any(libheif-js wasm)는 ~1MB라 동적 import.
async function ensureDecodableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  return Array.isArray(out) ? out[0] : out;
}

export async function resizeToDataUrl(file: File): Promise<string> {
  const blob = await ensureDecodableBlob(file);
  const url = URL.createObjectURL(blob);
  try {
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
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e instanceof Event ? new Error("image load failed") : e);
    img.src = src;
  });
}
