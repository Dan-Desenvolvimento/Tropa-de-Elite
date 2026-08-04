import { describe, expect, it } from "vitest";

import { ticketQrPayload } from "@/features/tickets/qr-payload";

describe("conteúdo do QR Code", () => {
  it("contém somente o prefixo e o token", () => {
    const token = "token-aleatorio-seguro-1234567890";
    expect(ticketQrPayload(token)).toBe(`EVENT:${token}`);
    expect(ticketQrPayload(token)).not.toContain("@");
    expect(ticketQrPayload(token)).not.toContain("Maria");
  });
});
