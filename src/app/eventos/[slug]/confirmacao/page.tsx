import { notFound } from "next/navigation";

import { TicketCard } from "@/features/tickets/components/ticket-card";
import { getPublicTicket } from "@/features/tickets/server/get-public-ticket";
import { createTicketQrDataUrl } from "@/features/tickets/server/qr-code";
import { TrackingBeacon } from "@/features/tracking/components/tracking-beacon";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
  searchParams,
}: PageProps<"/eventos/[slug]/confirmacao">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.ingresso === "string" ? query.ingresso : null;
  if (!token) notFound();

  const ticket = await getPublicTicket(token);
  if (!ticket || ticket.event.slug !== slug) notFound();
  const qrDataUrl = ticket.status === "confirmed"
    ? await createTicketQrDataUrl(ticket.ticketToken)
    : null;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050506] px-5 py-10 sm:px-8 sm:py-16">
      <TrackingBeacon source="form" eventId={ticket.event.id} registrationId={ticket.registrationId} />
      <div className="pointer-events-none absolute left-1/2 top-[-24rem] -z-10 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" />
      <TicketCard ticket={ticket} qrDataUrl={qrDataUrl} showSuccess />
    </main>
  );
}
