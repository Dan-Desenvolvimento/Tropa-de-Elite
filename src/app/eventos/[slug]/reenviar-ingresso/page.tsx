import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicEvent } from "@/features/events/server/get-public-event";
import { ResendTicketForm } from "@/features/registrations/components/resend-ticket-form";

export const dynamic = "force-dynamic";

export default async function ResendTicketPage({ params }: PageProps<"/eventos/[slug]/reenviar-ingresso">) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#050506] px-5 py-12 sm:px-8">
      <div className="pointer-events-none absolute left-1/2 top-[-22rem] -z-10 h-[50rem] w-[50rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" />
      <section className="glass-panel mx-auto w-full max-w-lg rounded-[2rem] p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">{event.name}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Reenviar ingresso</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Informe o e-mail usado na inscrição. Por segurança, a resposta será sempre a mesma.
        </p>
        <div className="mt-8">
          <ResendTicketForm eventSlug={event.slug} />
        </div>
        <Link href={`/eventos/${event.slug}`} className="mt-6 block text-center text-sm text-zinc-500 underline underline-offset-4">
          Voltar para o evento
        </Link>
      </section>
    </main>
  );
}
