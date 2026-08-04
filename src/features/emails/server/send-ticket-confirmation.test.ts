import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  failedUpdates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "registrations") {
        const query = {
          select: () => query,
          eq: () => query,
          single: async () => ({
            data: {
              id: "registration-1",
              event_id: "event-1",
              full_name: "Maria Silva",
              email: "maria@example.com",
              ticket_code: "TDE-ABC123",
              ticket_token: "token-seguro",
              status: "confirmed",
            },
            error: null,
          }),
        };
        return query;
      }

      if (table === "events") {
        const query = {
          select: () => query,
          eq: () => query,
          single: async () => ({
            data: {
              id: "event-1",
              name: "Tropa de Elite",
              start_at: "2026-09-19T15:00:00.000Z",
              timezone: "America/Bahia",
              venue_name: "Auditório",
              address: "Rua do Evento, 100",
              city: "Salvador",
              whatsapp_group_url: null,
              support_email: null,
              email_subject: null,
            },
            error: null,
          }),
        };
        return query;
      }

      return {
        select: () => {
          const query = {
            eq: () => query,
            then: (resolve: (value: { count: number }) => void) => resolve({ count: 0 }),
          };
          return query;
        },
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: "email-log-1" }, error: null }) }),
        }),
        update: (values: Record<string, unknown>) => {
          mocks.failedUpdates.push(values);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  }),
}));

vi.mock("@/features/tickets/server/qr-code", () => ({
  createTicketQrBuffer: vi.fn(),
}));

import { sendTicketConfirmation } from "./send-ticket-confirmation";

describe("sendTicketConfirmation", () => {
  const original = {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EVENT_FROM_EMAIL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };

  beforeEach(() => {
    mocks.failedUpdates.length = 0;
    delete process.env.RESEND_API_KEY;
    process.env.EVENT_FROM_EMAIL = "Tropa de Elite <ingressos@example.com>";
    process.env.NEXT_PUBLIC_APP_URL = "https://eventos.example.com";
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = original.apiKey;
    process.env.EVENT_FROM_EMAIL = original.from;
    process.env.NEXT_PUBLIC_APP_URL = original.appUrl;
  });

  it("mantém a inscrição e registra falha quando o provedor não está configurado", async () => {
    const result = await sendTicketConfirmation("registration-1");

    expect(result).toEqual({ sent: false, reason: "NOT_CONFIGURED" });
    expect(mocks.failedUpdates).toEqual([
      expect.objectContaining({
        status: "failed",
        error_message: "Email provider environment is not configured.",
      }),
    ]);
  });
});
