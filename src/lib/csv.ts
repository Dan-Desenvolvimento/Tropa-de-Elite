export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function createBrazilianCsv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n")}`;
}
