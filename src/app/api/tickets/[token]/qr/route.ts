import { createTicketQrBuffer } from "@/features/tickets/server/qr-code";
import { getPublicTicket } from "@/features/tickets/server/get-public-ticket";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ticket = await getPublicTicket(token);
  if (!ticket || ticket.status !== "confirmed") {
    return new Response("Ingresso não encontrado.", { status: 404 });
  }

  const qr = await createTicketQrBuffer(ticket.ticketToken);
  return new Response(new Uint8Array(qr), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="ingresso-${ticket.ticketCode}.png"`,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
