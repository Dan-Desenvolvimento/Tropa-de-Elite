import { describe, expect, it } from "vitest";

import { createBrazilianCsv, csvCell } from "@/lib/csv";

describe("CSV brasileiro", () => {
  it("protege aspas e separadores", () => {
    expect(csvCell('Empresa "Elite"; BA')).toBe('"Empresa ""Elite""; BA"');
  });

  it("inclui BOM, ponto e vírgula e CRLF", () => {
    const csv = createBrazilianCsv(["Nome", "Cidade"], [["João", "Vitória da Conquista"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Nome";"Cidade"\r\n');
    expect(csv).toContain('"João";"Vitória da Conquista"');
  });
});
