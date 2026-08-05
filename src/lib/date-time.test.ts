import { describe, expect, it } from "vitest";

import { formatDateTime } from "./date-time";

describe("formatDateTime", () => {
  it("converte UTC para o fuso do evento", () => {
    const result = formatDateTime(
      "2026-08-05T14:12:30.000Z",
      "America/Bahia",
    );

    expect(result).toContain("11:12:30");
  });

  it("usa o fuso padrão quando o fuso recebido Ã© inválido", () => {
    const result = formatDateTime(
      "2026-08-05T14:12:30.000Z",
      "Fuso/Invalido",
    );

    expect(result).toContain("11:12:30");
  });
});