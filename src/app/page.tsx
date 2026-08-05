import { ArrowRight, CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";

import { getFeaturedPublicEvent } from "@/features/events/server/get-public-event";
import { RegistrationForm } from "@/features/registrations/components/registration-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getFeaturedPublicEvent();
  const registrationOpensLater = Boolean(
    event?.registrationOpenAt && new Date() < new Date(event.registrationOpenAt),
  );
  const registrationOpen = Boolean(event && !registrationOpensLater);
  const eventDetails = event
    ? [
        {
          icon: CalendarDays,
          label: new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "long",
            timeZone: event.timezone,
          }).format(new Date(event.startAt)),
        },
        {
          icon: Clock3,
          label: new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: event.timezone,
          }).format(new Date(event.startAt)),
        },
        { icon: MapPin, label: `${event.venueName} · ${event.city}` },
      ]
    : [];
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050506]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
              <ShieldCheck className="size-4 text-red-500" />
              Exclusivo para líderes, gerentes, empresários e vendedores
            </div>

            <div className="relative mb-8 h-24 w-72 overflow-hidden" aria-label="Tropa de Elite">
              <Image
                src="/Tropa-de-elite-branca-para-fundo-preto.png"
                alt="Tropa de Elite"
                fill
                priority
                sizes="288px"
                className="object-cover object-[center_59%]"
              />
            </div>

            <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Transforme seus líderes em uma equipe que entrega
              <span className="text-red-500"> resultados.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
              Um método prático de gestão, mentalidade de dono e execução para tirar o peso do operacional das suas costas e fazer a empresa avançar.
            </p>

            {eventDetails.length > 0 ? (
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-4 text-sm text-zinc-300">
                {eventDetails.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className="size-4 text-red-500" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : null}

            
          </div>

          <aside id="inscricao" className="glass-panel rounded-[2rem] p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">Inscrição oficial</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {registrationOpen ? "Sua vaga começa aqui." : "Inscrições indisponíveis."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {event
                  ? registrationOpensLater
                    ? "As inscrições deste evento ainda não foram abertas."
                    : "Preencha seus dados. A confirmação e o ingresso com QR Code serão exibidos imediatamente."
                  : "Nenhum evento está recebendo inscrições neste momento."}
              </p>
            </div>
            {event ? (
              <RegistrationForm
                eventSlug={event.slug}
                privacyPolicyUrl={event.privacyPolicyUrl}
                customFields={event.customFields}
                disabled={!registrationOpen}
              />
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/30 p-5 text-sm leading-6 text-zinc-400">
                Assim que um evento for aberto no painel administrativo, o formulário será liberado automaticamente aqui.
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
