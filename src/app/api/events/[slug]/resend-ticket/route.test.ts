import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  sendTicketConfirmation: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: vi.fn() }),
}));
vi.mock("@/features/emails/server/send-ticket-confirmation", () => ({ sendTicketConfirmation: mocks.sendTicketConfirmation }));

import { POST } from "./route";

describe("reenvio público de ingresso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHECKIN_RATE_LIMIT_SECRET = "segredo-de-teste-com-tamanho-suficiente";
    mocks.rpc.mockResolvedValueOnce({ data: { allowed: false } }).mockResolvedValueOnce({ data: { allowed: false } });
  });

  it("mantém resposta neutra e não envia e-mail quando o limite é excedido", async () => {
    const response = await POST(
      new Request("https://eventos.example.com/api/events/tropa/resend-ticket", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ email: "participante@example.com" }),
      }),
      { params: Promise.resolve({ slug: "tropa" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { message: "Caso exista uma inscrição vinculada a este e-mail, enviaremos novamente o ingresso." },
    });
    expect(mocks.sendTicketConfirmation).not.toHaveBeenCalled();
  });
});
