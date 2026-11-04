// Checks an uploaded file's actual bytes ("magic numbers") instead of trusting the browser's
// claimed MIME type, so a renamed non-image file can't be stored as a product photo.

export const IMAGE_EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif" } as const;
export type ImageType = keyof typeof IMAGE_EXTENSIONS;

const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

/** Returns the real image type from the file header, or null if it isn't a supported image. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return "image/avif";
  return null;
}

/** Reads a File, verifies it is a real image matching its claimed type, and returns its bytes + extension. */
export async function readVerifiedImage(file: File): Promise<{ bytes: Buffer; extension: string } | null> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectImageType(bytes);
  if (!detected || detected !== file.type) return null;
  return { bytes, extension: IMAGE_EXTENSIONS[detected] };
}
