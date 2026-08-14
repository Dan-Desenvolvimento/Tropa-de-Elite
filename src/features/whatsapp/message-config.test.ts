import { describe, expect, it } from "vitest";

import {
  extractVariablePositions,
  whatsappMessageConfigSchema,
} from "./message-config";

const validMessage = {
  displayName: "Localização do evento",
  description: null,
  templateName: "localizacao_evento",
  templateLanguage: "pt_BR",
  previewBody: "Olá, {{1}}! O evento será em {{2}}.",
  headerKind: "image" as const,
  headerMediaUrl: "https://tropa.filipezetech.com/mapa.png",
  bodyVariables: [
    { position: 1, source: "participant.first_name" as const },
    { position: 2, source: "event.full_location" as const },
  ],
  buttonConfig: {
    mode: "dynamic" as const,
    index: 0,
    label: "ABRIR MAPA",
    baseUrl: "https://www.google.com/maps/search/?api=1&query=",
    source: "event.maps_query" as const,
    transform: "none" as const,
  },
  active: true,
};

describe("whatsappMessageConfigSchema", () => {
  it("aceita um modelo completo com variáveis mapeadas", () => {
    expect(whatsappMessageConfigSchema.safeParse(validMessage).success).toBe(true);
  });

  it("recusa variável ausente e posição repetida", () => {
    const result = whatsappMessageConfigSchema.safeParse({
      ...validMessage,
      bodyVariables: [
        { position: 1, source: "participant.first_name" },
        { position: 1, source: "event.name" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("recusa lacunas na sequência de variáveis", () => {
    const result = whatsappMessageConfigSchema.safeParse({
      ...validMessage,
      previewBody: "Olá, {{1}}. Data: {{3}}.",
      bodyVariables: [
        { position: 1, source: "participant.first_name" },
        { position: 3, source: "event.date_long" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("recusa variáveis fora do intervalo permitido", () => {
    const result = whatsappMessageConfigSchema.safeParse({
      ...validMessage,
      previewBody: "Olá, {{1}}. Inválida: {{21}}.",
      bodyVariables: [
        { position: 1, source: "participant.first_name" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("recusa variáveis não numéricas", () => {
    const result = whatsappMessageConfigSchema.safeParse({
      ...validMessage,
      previewBody: "Olá, {{nome}}.",
      bodyVariables: [],
    });
    expect(result.success).toBe(false);
  });

  it("recusa credenciais embutidas na URL da imagem", () => {
    expect(
      whatsappMessageConfigSchema.safeParse({
        ...validMessage,
        headerMediaUrl: "https://usuario:senha@example.com/mapa.png",
      }).success,
    ).toBe(false);
  });

  it("recusa URL-base insegura no botão dinâmico", () => {
    expect(
      whatsappMessageConfigSchema.safeParse({
        ...validMessage,
        buttonConfig: {
          ...validMessage.buttonConfig,
          baseUrl: "http://example.com/ingresso",
        },
      }).success,
    ).toBe(false);
  });

  it("impede campos comuns de texto como complemento de URL", () => {
    expect(
      whatsappMessageConfigSchema.safeParse({
        ...validMessage,
        buttonConfig: {
          ...validMessage.buttonConfig,
          source: "participant.full_name",
        },
      }).success,
    ).toBe(false);
  });
});

describe("extractVariablePositions", () => {
  it("ordena e remove posições repetidas", () => {
    expect(extractVariablePositions("{{2}} {{1}} {{2}} {{21}}")).toEqual([1, 2]);
  });
});
