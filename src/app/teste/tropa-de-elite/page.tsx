import Image from "next/image";
import Link from "next/link";
import { TrackingBeacon } from "@/features/tracking/components/tracking-beacon";
import { ArrowRight, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";

const FORM_URL = "https://tropa.filipezetech.com/inscricao";

export const metadata = {
  title: "Tropa de Elite — Liderança que entrega resultado",
  description:
    "Um método prático para líderes, empresários e equipes que querem assumir o controle da operação e acelerar resultados.",
};

export default function TropaDeEliteTestPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050506] text-white">
      <TrackingBeacon source="site" />
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[-18rem] top-[42rem] size-[42rem] rounded-full bg-red-950/35 blur-[150px]" />
        <div className="absolute right-[-20rem] top-[92rem] size-[48rem] rounded-full bg-red-900/20 blur-[170px]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_72%,transparent)]" />
      </div>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-22rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="#top" aria-label="Tropa de Elite — início" className="relative h-14 w-48 overflow-hidden">
          <Image
            src="/Tropa-de-elite-branca-para-fundo-preto.png"
            alt="Tropa de Elite"
            fill
            priority
            sizes="192px"
            className="object-contain object-center"
          />
        </Link>
        <Link
          href={FORM_URL}
          data-track="header_cta"
          className="hidden min-h-11 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-100 transition hover:bg-red-500/20 sm:inline-flex"
        >
          Quero participar <ArrowRight className="size-4" />
        </Link>
      </header>

      <section id="top" className="relative grid min-h-[720px] w-full items-center gap-12 overflow-hidden px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12 lg:pb-28">
        <Image src="/tropa-hero-placeholder.png" alt="Mentor em ambiente de liderança" fill priority sizes="100vw" className="object-cover object-[68%_center] opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050506] via-[#050506]/90 to-[#050506]/15" />
        <div className="relative mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-200">
            <Sparkles className="size-4 text-red-500" />
            Imersão para quem lidera de verdade
          </div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Pare de carregar a empresa nas costas.
            <span className="text-red-500"> Faça sua equipe entregar.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-xl sm:leading-8">
            Um método prático de gestão, mentalidade de dono e execução para tirar o peso do operacional das suas costas e fazer a empresa avançar.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={FORM_URL} data-track="hero_cta" className="brand-glow inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-red-500">
              Garantir minha vaga <ArrowRight className="size-5" />
            </Link>
            <a href="#para-quem" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-4 text-sm font-semibold text-zinc-300 transition hover:bg-white/5">
              Entender o método <ChevronDown className="size-4" />
            </a>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="size-4 text-emerald-500" /> Inscrição oficial e confirmação por e-mail.</p>
          </div>
        </div>
      </section>

      <section id="para-quem" className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mb-12 text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Para quem é</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">O método para quem precisa liderar sem desculpas.</h2></div>
        <div className="grid gap-6 border-t border-white/8 pt-12 sm:grid-cols-3">
          {[
            ["01", "Gestão e liderança", "Para gerentes, supervisores e gestores que foram promovidos pela execução e agora precisam liderar pessoas.", "Parar de apagar incêndios e construir autonomia operacional."],
            ["02", "Mentalidade empresarial", "Para profissionais que pensam como sócios, não como funcionários que apenas esperam ordens.", "Trocar passividade por responsabilidade e velocidade."],
            ["03", "Vendas e resultados", "Para quem precisa de previsibilidade, metas claras e uma rotina comercial que não dependa do humor do mercado.", "Acompanhar métricas e bater metas com método."],
          ].map(([number, title, text, result]) => (
            <article key={number} className="rounded-2xl border border-white/8 bg-white/[0.025] p-6">
              <span className="text-sm font-bold text-red-500">{number}</span>
              <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{text}</p>
              <p className="mt-5 border-t border-white/8 pt-5 text-sm leading-6 text-zinc-300"><strong className="text-white">O resultado:</strong> {result}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-24 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:pb-32">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Quem vai liderar o treinamento?</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Experiência de quem vive o desafio do lado de dentro.</h2>
          <div className="mt-6 space-y-4 text-base leading-7 text-zinc-400">
            <p><strong className="text-white">Filipe Zetech</strong> não fala de gestão de uma sala de aula. Ele conhece a pressão, a cobrança e o peso de fazer uma empresa avançar.</p>
            <p>Depois de anos ajudando donos de pequenas e médias empresas, transformou esse conhecimento em um método direto, prático e sem enrolação.</p>
            <p>Agora, esse método chega ao Tropa de Elite para formar gerentes, supervisores e líderes capazes de fazer o negócio crescer sem depender deles para tudo.</p>
          </div>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-red-500/20 shadow-[0_25px_80px_rgba(127,29,29,.25)]">
          <Image src="/tropa-mentor-placeholder.png" alt="Mentor do Tropa de Elite" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-24 text-center sm:px-8 lg:pb-32">
        <div className="glass-panel rounded-[2rem] p-7 sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Acesso especial</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">O acesso ao método de gestão prático que você precisa é gratuito.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">Se você fosse contratar uma consultoria individual para treinar sua liderança, o investimento seria alto. Nesta edição, você pode participar sem custo — basta garantir sua vaga.</p>
          <Link href={FORM_URL} data-track="offer_cta" className="brand-glow mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-red-600 px-7 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-red-500">Garantir acesso gratuito <ArrowRight className="size-5" /></Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-24 text-center sm:px-8 lg:pb-32">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">O próximo passo é simples</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Sua equipe não precisa de mais uma palestra. Precisa de direção.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">Faça sua inscrição e receba a confirmação com todos os detalhes do Tropa de Elite.</p>
        <Link href={FORM_URL} data-track="final_cta" className="brand-glow mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-red-600 px-7 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-red-500">Quero garantir minha vaga <ArrowRight className="size-5" /></Link>
      </section>
    </main>
  );
}
