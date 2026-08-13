import { CalendarDays, Clock3, MapPin, MessageCircle, ShieldCheck, TicketCheck } from "lucide-react";

import type { PublicTicket } from "@/features/tickets/types";
import { TicketGroupRedirect } from "@/features/tickets/components/ticket-group-redirect";

type TicketCardProps = {
  ticket: PublicTicket;
  qrDataUrl: string | null;
  showSuccess?: boolean;
};

const statusLabels = {
  confirmed: "Inscrição confirmada",
  waitlist: "Lista de espera",
  cancelled: "Inscrição cancelada",
};

export function TicketCard({ ticket, qrDataUrl, showSuccess = false }: TicketCardProps) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: ticket.event.timezone,
  }).format(new Date(ticket.event.startAt));
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ticket.event.timezone,
  }).format(new Date(ticket.event.startAt));

  return (
    <div className="glass-panel mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem]">
      <div className="border-b border-white/8 bg-gradient-to-r from-red-600/15 to-transparent p-6 sm:p-8">
        {showSuccess ? (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            <ShieldCheck className="size-4" /> Inscrição recebida
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {statusLabels[ticket.status]}
        </h1>
        <p className="mt-2 text-zinc-400">{ticket.participantName}</p>
      </div>

      <div className={`grid gap-8 p-6 sm:p-8 ${qrDataUrl ? "md:grid-cols-[1fr_260px]" : ""}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Evento</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{ticket.event.name}</h2>

          <div className="mt-6 space-y-4 text-sm text-zinc-300">
            <Detail icon={CalendarDays}>{date}</Detail>
            <Detail icon={Clock3}>{time}</Detail>
            <Detail icon={MapPin}>
              {ticket.event.venueName} · {ticket.event.address} · {ticket.event.city}
            </Detail>
            <Detail icon={TicketCheck}>Código: {ticket.ticketCode}</Detail>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {showSuccess && ticket.status === "confirmed" ? (
              <a
                href={`/ingresso/${encodeURIComponent(ticket.ticketToken)}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
              >
                Abrir meu ingresso
              </a>
            ) : null}
            {qrDataUrl ? (
              <a
                href={qrDataUrl}
                download={`ingresso-${ticket.ticketCode}.png`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Salvar ingresso
              </a>
            ) : null}
            {ticket.status === "confirmed" && ticket.event.whatsappGroupUrl ? (
              <a
                href={ticket.event.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <MessageCircle className="size-4" /> Entrar no grupo oficial
              </a>
            ) : null}
          </div>
        </div>

        {qrDataUrl ? <div className="rounded-2xl bg-white p-4 text-center">
          {/* Data URL gerada localmente pelo servidor; não contém dados pessoais. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR Code do ingresso ${ticket.ticketCode}`} className="mx-auto aspect-square w-full" />
          <p className="mt-2 font-mono text-sm font-bold tracking-[0.14em] text-zinc-900">{ticket.ticketCode}</p>
        </div> : (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
            Sua vaga ainda não está confirmada. Se houver disponibilidade, a equipe seguirá a ordem de inscrição e enviará o ingresso por e-mail.
          </div>
        )}
      </div>

      <div className="border-t border-white/8 bg-black/25 px-6 py-5 text-center text-sm leading-6 text-zinc-400 sm:px-8">
        {ticket.status === "confirmed"
          ? "Apresente este QR Code na entrada. Ele é individual e não deve ser compartilhado. Verifique também sua caixa de entrada e a pasta de spam."
          : "Você está na lista de espera. Aguarde a confirmação da equipe antes de comparecer ao evento."}
      </div>
      {showSuccess && ticket.status === "confirmed" ? <div className="px-6 pb-6 text-center sm:px-8"><TicketGroupRedirect groupUrl={ticket.event.whatsappGroupUrl} /></div> : null}
    </div>
  );
}

function Detail({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-red-500" />
      <span>{children}</span>
    </div>
  );
}
