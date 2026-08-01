/** Client-side image handling (spec §6.2): downscale + compress before upload,
 * and strip metadata (re-encoding via canvas drops EXIF, including location). */

export interface PreparedImage {
  /** Object URL for preview (revoke when done). */
  previewUrl: string;
  /** Compressed JPEG blob to upload. */
  blob: Blob;
  width: number;
  height: number;
}

const MAX_EDGE = 1280;
const QUALITY = 0.8;

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) (bitmap as ImageBitmap).close?.();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      QUALITY,
    ),
  );

  return { previewUrl: URL.createObjectURL(blob), blob, width, height };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* HEIC / unsupported — fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const MAX_IMAGES = 5;
export const MAX_FILE_MB = 15;
