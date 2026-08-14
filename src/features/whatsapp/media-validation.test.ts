import { describe, expect, it } from "vitest";

import {
  hasExpectedWhatsAppMediaSignature,
  WHATSAPP_MEDIA_RULES,
} from "./media-validation";

describe("WhatsApp media validation", () => {
  it("limita vídeo MP4 a 16 MB", () => {
    expect(WHATSAPP_MEDIA_RULES["video/mp4"]).toMatchObject({
      extension: "mp4",
      kind: "video",
      maxSize: 16 * 1024 * 1024,
    });
  });

  it("reconhece contêiner ISO BMFF/MP4 pelo box ftyp", () => {
    const mp4 = new Uint8Array([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6f, 0x6d,
    ]);
    expect(hasExpectedWhatsAppMediaSignature(mp4, "video/mp4")).toBe(true);
  });

  it("recusa arquivo arbitrário declarado como vídeo", () => {
    expect(
      hasExpectedWhatsAppMediaSignature(
        new TextEncoder().encode("conteúdo não é um MP4"),
        "video/mp4",
      ),
    ).toBe(false);
  });

  it("recusa contêiner 3GP declarado como MP4", () => {
    const threeGp = new Uint8Array([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70,
      0x33, 0x67, 0x70, 0x34,
    ]);
    expect(hasExpectedWhatsAppMediaSignature(threeGp, "video/mp4")).toBe(false);
  });

  it("preserva validações de JPG e PNG", () => {
    expect(
      hasExpectedWhatsAppMediaSignature(
        new Uint8Array([0xff, 0xd8, 0xff]),
        "image/jpeg",
      ),
    ).toBe(true);
    expect(
      hasExpectedWhatsAppMediaSignature(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
    ).toBe(true);
  });
});
