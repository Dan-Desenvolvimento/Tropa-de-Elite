import { describe, expect, it } from "vitest";

import { adminEventSchema } from "@/features/events/admin-schema";

const event = {
  name: "Tropa de Elite", slug: "tropa-de-elite", description: "Treinamento",
  startAt: "2026-08-16T11:00:00.000Z", endAt: "2026-08-16T20:00:00.000Z",
  timezone: "America/Bahia", venueName: "Auditório FZ", address: "Rua Cuiabá, 42",
  city: "Vitória da Conquista", capacity: 300, waitlistEnabled: true,
  showRemainingSlots: true, whatsappGroupUrl: "https://chat.whatsapp.com/exemplo",
  registrationStatus: "open", registrationOpenAt: null, registrationCloseAt: "2026-08-16T10:00:00.000Z",
  emailSubject: null, confirmationMessage: null, supportEmail: "equipe@example.com",
  privacyPolicyUrl: "https://example.com/privacidade", requireCheckinConfirmation: true,
};

describe("adminEventSchema", () => {
  it("aceita configuração válida", () => expect(adminEventSchema.safeParse(event).success).toBe(true));
  it("rejeita slug inválido", () => expect(adminEventSchema.safeParse({ ...event, slug: "Tropa de Elite" }).success).toBe(false));
  it("exige política para abrir inscrições", () => expect(adminEventSchema.safeParse({ ...event, privacyPolicyUrl: null }).success).toBe(false));
  it("rejeita fim anterior ao início", () => expect(adminEventSchema.safeParse({ ...event, endAt: "2026-08-15T20:00:00.000Z" }).success).toBe(false));
  it("rejeita seleção personalizada com menos de duas opções", () => expect(adminEventSchema.safeParse({ ...event, customFields: [{ id: "cargo", label: "Cargo", type: "select", required: true, options: ["Gerente"] }] }).success).toBe(false));
});
