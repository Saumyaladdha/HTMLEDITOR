/**
 * File-picker or clipboard-paste image swap. Resizes client-side (cap the
 * longest edge, since these are A4-print figure slots, not full-camera-res
 * assets) and re-encodes as a base64 data URI — matching the "images embedded
 * as base64, no separate asset storage" requirement, entirely client-side
 * until the next full-HTML save.
 *
 * TRANSPARENCY IS PRESERVED. This used to always encode JPEG, which has no
 * alpha channel: a cut-out diagram on a transparent background came out with
 * every transparent pixel flattened to BLACK, so a science doodle dropped
 * into a figure box appeared as a black rectangle. Almost all of this book's
 * artwork is transparent PNG, so that hit the common case rather than an edge
 * one.
 */

const MAX_EDGE = 1200;
const QUALITY = 0.88;

/** Formats that can carry an alpha channel. A JPEG source never can, so it is
 * safe to re-encode as JPEG, which compresses photographs far better. */
const ALPHA_TYPES = /^image\/(png|webp|gif|avif|svg\+xml)$/i;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => resolve(resizeAndEncode(img, ALPHA_TYPES.test(file.type)));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Re-encodes at print size, keeping alpha when the source could have it.
 *
 * WebP is preferred for transparent art: it keeps the alpha channel and is
 * far smaller than PNG, which matters when the result is inlined as base64
 * into a chapter that already runs to megabytes. A browser without WebP
 * encoding returns a PNG data URL from `toDataURL` rather than failing, so
 * the result is checked instead of assumed.
 */
export function resizeAndEncode(img: HTMLImageElement, mayHaveAlpha: boolean): string {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
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

  if (!mayHaveAlpha) return canvas.toDataURL("image/jpeg", QUALITY);

  const webp = canvas.toDataURL("image/webp", QUALITY);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/png");
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
