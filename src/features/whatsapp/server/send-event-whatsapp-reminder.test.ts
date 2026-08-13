import { describe, expect, it } from "vitest";

import { createWhatsAppReminderComponents } from "./send-event-whatsapp-reminder";

describe("createWhatsAppReminderComponents", () => {
  it("monta as cinco variáveis do corpo e o token no botão de URL", () => {
    const components = createWhatsAppReminderComponents({
      headerImageUrl: "https://tropa.filipezetech.com/imagem-evento.png",
      participantName: "João Miguel",
      eventName: "Tropa de Elite",
      eventDate: "16 de agosto de 2026",
      eventTime: "08:00",
      eventLocation: "FZ Espaço de Eventos — Vitória da Conquista, BA",
      ticketToken: "token-individual",
    });

    expect(components).toEqual([
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: "https://tropa.filipezetech.com/imagem-evento.png" },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "João" },
          { type: "text", text: "Tropa de Elite" },
          { type: "text", text: "16 de agosto de 2026" },
          { type: "text", text: "08:00" },
          { type: "text", text: "FZ Espaço de Eventos — Vitória da Conquista, BA" },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "token-individual" }],
      },
    ]);
  });
});
