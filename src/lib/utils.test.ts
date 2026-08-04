import { describe, expect, it } from "vitest";

import { normalizeEmail, normalizePhone } from "@/lib/utils";

describe("normalização de dados", () => {
  it("normaliza e-mail", () => {
    expect(normalizeEmail("  Pessoa@Exemplo.COM ")).toBe("pessoa@exemplo.com");
  });

  it("mantém somente os dígitos do telefone", () => {
    expect(normalizePhone("(77) 9 9999-8888")).toBe("77999998888");
  });
});
