import { notFound } from "next/navigation";

import { TicketCard } from "@/features/tickets/components/ticket-card";
import { getPublicTicket } from "@/features/tickets/server/get-public-ticket";
import { createTicketQrDataUrl } from "@/features/tickets/server/qr-code";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: PageProps<"/ingresso/[token]">) {
  const { token } = await params;
  const ticket = await getPublicTicket(token);
  if (!ticket) notFound();

  const qrDataUrl = await createTicketQrDataUrl(ticket.ticketToken);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050506] px-5 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-[-24rem] -z-10 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" />
      <TicketCard ticket={ticket} qrDataUrl={qrDataUrl} />
    </main>
  );
}
