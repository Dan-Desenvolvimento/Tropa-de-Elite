export const WHATSAPP_MEDIA_RULES = {
  "image/jpeg": { extension: "jpg", maxSize: 5 * 1024 * 1024, kind: "image" as const },
  "image/png": { extension: "png", maxSize: 5 * 1024 * 1024, kind: "image" as const },
  "video/mp4": { extension: "mp4", maxSize: 16 * 1024 * 1024, kind: "video" as const },
} as const;

export type WhatsAppMediaMimeType = keyof typeof WHATSAPP_MEDIA_RULES;

const MP4_COMPATIBLE_BRANDS = new Set([
  "avc1",
  "dash",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "isom",
  "mmp4",
  "mp41",
  "mp42",
  "MSNV",
]);

export function hasExpectedWhatsAppMediaSignature(
  bytes: Uint8Array,
  contentType: WhatsAppMediaMimeType,
) {
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  return (
    bytes.length >= 12 &&
    matchesAt(bytes, 4, "ftyp") &&
    MP4_COMPATIBLE_BRANDS.has(asciiAt(bytes, 8, 4))
  );
}

function matches(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function matchesAt(bytes: Uint8Array, offset: number, value: string) {
  return [...value].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
