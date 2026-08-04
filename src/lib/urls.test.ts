import { describe, expect, it } from "vitest";

import { isSafeHttpsUrl, safeHttpsUrl } from "@/lib/urls";

describe("URLs externas", () => {
  it("aceita HTTPS sem credenciais", () => expect(isSafeHttpsUrl("https://example.com/path")).toBe(true));
  it("rejeita HTTP", () => expect(isSafeHttpsUrl("http://example.com")).toBe(false));
  it("rejeita protocolos executáveis", () => expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false));
  it("rejeita credenciais embutidas", () => expect(isSafeHttpsUrl("https://user:pass@example.com")).toBe(false));
  it("normaliza URL insegura para null", () => expect(safeHttpsUrl("data:text/html,test")).toBeNull());
});
