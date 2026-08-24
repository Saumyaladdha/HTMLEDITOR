/**
 * File-picker or clipboard-paste image swap. Resizes client-side (cap the
 * longest edge, since these are A4-print figure slots, not full-camera-res
 * assets) and re-encodes as JPEG before converting to a base64 data URI —
 * matching the "images embedded as base64, no separate asset storage"
 * requirement, entirely client-side until the next full-HTML save.
 */

const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.8;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => resolve(resizeAndEncode(img));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function resizeAndEncode(img: HTMLImageElement): string {
  let { width, height } = img;
  if (width > MAX_EDGE || height > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/** Listens for a paste event anywhere in `doc` and resolves with the first
 * pasted image's data URL, if any. Caller is responsible for scoping when
 * this listener is active (only while an image sub-part is selected). */
export function listenForPastedImage(doc: Document, onImage: (dataUrl: string) => void): () => void {
  const handler = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          fileToDataUrl(file).then(onImage);
        }
        return;
      }
    }
  };
  doc.addEventListener("paste", handler);
  return () => doc.removeEventListener("paste", handler);
}
