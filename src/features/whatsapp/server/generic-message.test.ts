import { describe, expect, it } from "vitest";

import type { WhatsAppMessageConfigRow } from "@/features/whatsapp/message-config";
import {
  assertEligibleRegistration,
  createConfiguredMessageComponents,
  normalizeBrazilianPhone,
  renderConfiguredPreview,
  type WhatsAppEventData,
  type WhatsAppRegistrationData,
} from "./generic-message";

const event: WhatsAppEventData = {
  id: "event-1",
  name: "Tropa de Elite",
  start_at: "2026-08-16T11:00:00.000Z",
  timezone: "America/Bahia",
  venue_name: "FZ Espaço de Eventos",
  address: "Rua do Evento, 100",
  city: "Vitória da Conquista, BA",
  whatsapp_group_url: null,
};

const registration: WhatsAppRegistrationData = {
  id: "registration-1",
  full_name: "João Miguel",
  phone: "77999999999",
  ticket_code: "TDE-ABC123",
  ticket_token: "token-individual",
  status: "confirmed",
  communications_consent: true,
};

const config: WhatsAppMessageConfigRow = {
  id: "config-1",
  event_id: event.id,
  display_name: "Ingresso",
  description: null,
  template_name: "lembrete_inscricao_event",
  template_language: "pt_BR",
  preview_body: "Olá, {{1}}! Evento: {{2}}.",
  header_kind: "image",
  header_media_url: "/cabecalho-whatsapp-evento.png",
  body_variables: [
    { position: 1, source: "participant.first_name" },
    { position: 2, source: "event.name" },
  ],
  button_config: {
    mode: "dynamic",
    index: 0,
    label: "INGRESSO",
    baseUrl: "https://tropa.filipezetech.com/ingresso",
    source: "participant.ticket_path",
    transform: "leading_slash",
  },
  active: true,
  sort_order: 0,
  created_at: "2026-08-13T00:00:00.000Z",
  updated_at: "2026-08-13T00:00:00.000Z",
};

describe("configured WhatsApp message", () => {
  it("monta mídia, corpo ordenado e complemento do botão", () => {
    expect(
      createConfiguredMessageComponents({
        config,
        event,
        registration,
        appUrl: "https://tropa.filipezetech.com/",
      }),
    ).toEqual([
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: "https://tropa.filipezetech.com/cabecalho-whatsapp-evento.png" },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "João" },
          { type: "text", text: "Tropa de Elite" },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "/token-individual" }],
      },
    ]);
  });

  it("renderiza a prévia com os valores reais", () => {
    expect(renderConfiguredPreview({ config, event, registration })).toBe(
      "Olá, João! Evento: Tropa de Elite.",
    );
  });

  it("monta cabeçalho de vídeo com link público", () => {
    const [header] = createConfiguredMessageComponents({
      config: {
        ...config,
        header_kind: "video",
        header_media_url: "/whatsapp-media/video.mp4",
      },
      event,
      registration,
      appUrl: "https://tropa.filipezetech.com/",
    });
    expect(header).toEqual({
      type: "header",
      parameters: [
        {
          type: "video",
          video: {
            link: "https://tropa.filipezetech.com/whatsapp-media/video.mp4",
          },
        },
      ],
    });
  });

  it("bloqueia envio sem consentimento", () => {
    expect(() =>
      assertEligibleRegistration({
        ...registration,
        communications_consent: false,
      }),
    ).toThrow("não autorizou");
  });
});

describe("normalizeBrazilianPhone", () => {
  it("normaliza telefone nacional", () => {
    expect(normalizeBrazilianPhone("(77) 99999-9999")).toBe("5577999999999");
  });

  it("rejeita telefone inválido", () => {
    expect(normalizeBrazilianPhone("1234")).toBeNull();
  });
});
