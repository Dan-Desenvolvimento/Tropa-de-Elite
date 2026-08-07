import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";

import { EventCapacityIndicator } from "@/features/events/components/event-capacity-indicator";
import { getPublicEvent } from "@/features/events/server/get-public-event";
import { RegistrationForm } from "@/features/registrations/components/registration-form";
import { TrackingBeacon } from "@/features/tracking/components/tracking-beacon";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/eventos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getPublicEvent(slug);
    if (!event) return { title: "Evento não encontrado" };
    return {
      title: event.name,
      description: event.description ?? `Inscreva-se no evento ${event.name}.`,
    };
  } catch {
    return { title: "Tropa de Elite" };
  }
}

export default async function EventPage({ params }: PageProps<"/eventos/[slug]">) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const now = new Date();
  const registrationOpensLater =
    event.registrationOpenAt !== null && now < new Date(event.registrationOpenAt);
  const registrationClosedByDate =
    event.registrationCloseAt !== null && now > new Date(event.registrationCloseAt);
  const registrationOpen =
    event.registrationStatus === "open" && !registrationOpensLater && !registrationClosedByDate;

  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: event.timezone,
  }).format(new Date(event.startAt));
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timezone,
  }).format(new Date(event.startAt));

  const statusMessage = getStatusMessage({
    registrationOpen,
    registrationOpensLater,
    status: event.registrationStatus,
    registrationOpenAt: event.registrationOpenAt,
    timezone: event.timezone,
  });

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050506]">
      <TrackingBeacon source="form" eventId={event.id} />
      <div className="pointer-events-none absolute inset-0 -z-10">
        {event.coverImageUrl ? (
          <div
            className="absolute inset-x-0 top-0 h-[48rem] bg-cover bg-center opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]"
            style={{ backgroundImage: `url(${JSON.stringify(event.coverImageUrl)})` }}
          />
        ) : null}
        <div className="absolute left-1/2 top-[-22rem] h-[54rem] w-[54rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:py-20">
        <div className="lg:sticky lg:top-16 lg:self-start">
          <div className="relative mb-8 h-24 w-72 overflow-hidden" aria-label="Tropa de Elite">
            <Image
              src="/Tropa-de-elite-branca-para-fundo-preto.png"
              alt="Tropa de Elite"
              fill
              priority
              sizes="288px"
            className="object-contain object-center"
            />
          </div>

          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-200">
            <ShieldCheck className="size-4 text-red-500" /> Evento oficial
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl">
            {event.name}
          </h1>
          {event.description ? (
            <p className="mt-6 max-w-2xl whitespace-pre-line text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
              {event.description}
            </p>
          ) : null}

          <div className="mt-8 space-y-4 rounded-2xl border border-white/8 bg-black/25 p-5 text-sm text-zinc-300 backdrop-blur-lg">
            <Detail icon={CalendarDays}>{date}</Detail>
            <Detail icon={Clock3}>{time}</Detail>
            <Detail icon={MapPin}>
              {event.venueName} · {event.address} · {event.city}
            </Detail>
          </div>
        </div>

        <aside id="inscricao" className="glass-panel rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">Inscrição oficial</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {registrationOpen ? "Garanta sua participação." : "Inscrições indisponíveis."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{statusMessage}</p>
          </div>

          {event.showRemainingSlots &&
          event.capacity !== null &&
          event.remainingSlots !== null ? (
            <EventCapacityIndicator
              eventSlug={event.slug}
              capacity={event.capacity}
              remainingSlots={event.remainingSlots}
            />
          ) : null}

          <RegistrationForm
            eventSlug={event.slug}
            privacyPolicyUrl={event.privacyPolicyUrl ?? "/politica-de-privacidade"}
            customFields={event.customFields}
            disabled={!registrationOpen}
          />

          {event.supportEmail ? (
            <p className="mt-6 text-center text-xs text-zinc-600">
              Precisa de ajuda?{" "}
              <a className="text-zinc-400 underline" href={`mailto:${event.supportEmail}`}>
                {event.supportEmail}
              </a>
            </p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function Detail({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-red-500" />
      <span>{children}</span>
    </div>
  );
}

function getStatusMessage({
  registrationOpen,
  registrationOpensLater,
  status,
  registrationOpenAt,
  timezone,
}: {
  registrationOpen: boolean;
  registrationOpensLater: boolean;
  status: string;
  registrationOpenAt: string | null;
  timezone: string;
}) {
  if (registrationOpen) return "Preencha os seus dados. A confirmação e o ingresso serão exibidos imediatamente.";
  if (registrationOpensLater && registrationOpenAt) {
    const opensAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(registrationOpenAt));
    return `As inscrições serão abertas em ${opensAt}.`;
  }
  if (status === "sold_out") return "As vagas deste evento foram preenchidas.";
  if (status === "cancelled") return "Este evento foi cancelado.";
  return "As inscrições para este evento estão encerradas.";
}
