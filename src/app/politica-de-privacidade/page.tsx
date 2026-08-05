import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade e LGPD | Tropa de Elite",
  description:
    "Entenda como os dados pessoais são coletados, utilizados, armazenados e protegidos nas inscrições dos eventos Tropa de Elite.",
};

const policyVersion = "1.0";
const updatedAt = "4 de agosto de 2026";

export default function PrivacyPolicyPage() {
  const privacyEmail =
    process.env.EVENT_REPLY_TO_EMAIL || "equipadodanmkt@gmail.com";

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050506] text-zinc-300">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-24rem] h-[58rem] w-[58rem] -translate-x-1/2 rounded-full bg-red-700/15 blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
        <header className="mb-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>

          <div className="relative mb-8 h-20 w-60 overflow-hidden">
            <Image
              src="/Tropa-de-elite-branca-para-fundo-preto.png"
              alt="Tropa de Elite"
              fill
              priority
              sizes="240px"
              className="object-cover object-[center_59%]"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-200">
            <ShieldCheck className="size-4 text-red-500" />
            Privacidade e proteção de dados
          </div>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
            Política de Privacidade e LGPD
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg">
            Este documento explica como os dados pessoais são tratados durante a
            inscrição, emissão do ingresso, comunicação e check-in nos eventos
            organizados pela plataforma Tropa de Elite.
          </p>

          <p className="mt-4 text-sm text-zinc-600">
            Versão {policyVersion} · Última atualização: {updatedAt}
          </p>
        </header>

        <div className="space-y-6">
          <PolicySection icon={Scale} title="1. Responsável pelo tratamento">
            <p>
              A organização responsável pelo evento divulgado na plataforma Tropa
              de Elite atua como controladora dos dados pessoais, pois define as
              finalidades e os meios essenciais do tratamento.
            </p>
            <p>
              Dúvidas e solicitações sobre privacidade podem ser enviadas para{" "}
              <a
                className="text-red-400 underline underline-offset-4"
                href={`mailto:${privacyEmail}`}
              >
                {privacyEmail}
              </a>
              . Para proteger o titular, poderemos solicitar informações razoáveis
              para confirmar sua identidade.
            </p>
          </PolicySection>

          <PolicySection icon={Database} title="2. Dados pessoais tratados">
            <p>Conforme o formulário e a operação do evento, poderemos tratar:</p>
            <ul>
              <li>nome completo, e-mail, telefone/WhatsApp e cidade;</li>
              <li>respostas fornecidas em campos personalizados;</li>
              <li>
                registro de aceite desta Política e de comunicações opcionais;
              </li>
              <li>
                status da inscrição, código e token do ingresso, data de inscrição
                e informações de check-in;
              </li>
              <li>
                histórico de envio de e-mails, tentativas, falhas e identificadores
                técnicos do provedor;
              </li>
              <li>
                informações técnicas necessárias à segurança, incluindo dados do
                dispositivo e identificadores de rede protegidos por hash.
              </li>
            </ul>
            <p>
              Dados pessoais sensíveis não são solicitados como regra geral. Caso
              sejam realmente necessários, a finalidade e a necessidade deverão ser
              informadas de forma destacada antes da coleta.
            </p>
          </PolicySection>

          <PolicySection icon={UserRoundCheck} title="3. Finalidades e bases legais">
            <p>Os dados poderão ser usados para:</p>
            <ul>
              <li>validar e administrar a inscrição;</li>
              <li>controlar capacidade, duplicidades e lista de espera;</li>
              <li>gerar o ingresso individual e o QR Code;</li>
              <li>
                enviar confirmação, ingresso e informações essenciais do evento;
              </li>
              <li>
                realizar check-in, prevenir fraudes e manter registros de auditoria;
              </li>
              <li>prestar suporte e atender solicitações do participante;</li>
              <li>
                cumprir obrigações e proteger direitos da organização e dos
                participantes.
              </li>
            </ul>
            <p>
              Conforme a atividade, o tratamento poderá se apoiar na execução de
              procedimentos solicitados pelo participante, na prestação do serviço
              do evento, no cumprimento de obrigação legal ou regulatória, no
              exercício regular de direitos, no legítimo interesse e no
              consentimento, quando esta for a base adequada.
            </p>
            <p>
              O aceite desta Política confirma que o participante teve acesso às
              informações sobre o tratamento. Comunicações promocionais ou não
              essenciais dependerão de autorização específica e opcional.
            </p>
          </PolicySection>

          <PolicySection icon={Mail} title="4. Compartilhamento e fornecedores">
            <p>
              Os dados são compartilhados somente quando necessário para operar o
              evento. Poderemos utilizar Supabase para banco de dados e autenticação,
              Vercel para hospedagem e Resend para envio de e-mails.
            </p>
            <p>
              Informações também poderão ser compartilhadas com autoridades ou
              terceiros quando houver obrigação legal, ordem válida, prevenção a
              fraudes, proteção de direitos ou resposta a incidentes. Não
              comercializamos dados pessoais dos participantes.
            </p>
            <p>
              Alguns fornecedores podem processar informações em outros países. Nesses
              casos, buscamos serviços que ofereçam medidas de proteção e mecanismos
              compatíveis com a legislação brasileira.
            </p>
            <p>
              Ao acessar um grupo externo, como WhatsApp, o participante passa a se
              relacionar também com o respectivo provedor e suas regras de
              privacidade.
            </p>
          </PolicySection>

          <PolicySection icon={LockKeyhole} title="5. Segurança e retenção">
            <p>
              Adotamos medidas técnicas e administrativas compatíveis com a
              operação, incluindo controle de acesso, autenticação, separação de
              credenciais, registros de auditoria, limitação de tentativas,
              proteção de identificadores de rede por hash e QR Code com token
              aleatório.
            </p>
            <p>
              Os dados serão mantidos pelo período necessário para realizar o
              evento, administrar ingressos e check-ins, prestar suporte, prevenir
              fraudes, cumprir obrigações e demonstrar conformidade. Encerradas
              essas finalidades, serão eliminados ou anonimizados, salvo quando a
              conservação for permitida ou exigida por lei.
            </p>
            <p>
              Caso ocorra incidente de segurança relevante, serão adotadas medidas
              de contenção, avaliação e comunicação exigidas pela legislação
              aplicável.
            </p>
          </PolicySection>

          <PolicySection icon={UserRoundCheck} title="6. Direitos do titular">
            <p>Nos limites da LGPD, o titular pode solicitar:</p>
            <ul>
              <li>confirmação da existência de tratamento e acesso aos dados;</li>
              <li>correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>informações sobre finalidades e compartilhamentos;</li>
              <li>
                anonimização, bloqueio ou eliminação de dados desnecessários,
                excessivos ou irregulares;
              </li>
              <li>
                eliminação de dados tratados com consentimento, quando aplicável;
              </li>
              <li>revogação do consentimento;</li>
              <li>oposição a tratamento realizado em desconformidade com a lei;</li>
              <li>portabilidade, quando regulamentada e aplicável;</li>
              <li>
                revisão de decisões exclusivamente automatizadas, quando existirem.
              </li>
            </ul>
            <p>
              O atendimento é gratuito. Alguns pedidos poderão ser limitados quando
              houver obrigação de retenção, necessidade de preservar direitos de
              terceiros ou outra hipótese legal.
            </p>
          </PolicySection>

          <PolicySection icon={ShieldCheck} title="7. Menores, comunicações e atualizações">
            <p>
              Quando um evento admitir crianças ou adolescentes, a organização
              deverá observar as exigências aplicáveis, fornecer informações
              adequadas e solicitar participação ou autorização do responsável
              quando necessária, sempre considerando o melhor interesse do menor.
            </p>
            <p>
              Mensagens essenciais sobre confirmação, ingresso, data, local,
              segurança, cancelamento e suporte poderão ser enviadas mesmo sem
              autorização para comunicações promocionais, pois são necessárias à
              operação do evento.
            </p>
            <p>
              Esta Política poderá ser atualizada para refletir mudanças no sistema,
              no evento, em fornecedores ou na legislação. A versão e a data de
              atualização permanecerão visíveis nesta página.
            </p>
          </PolicySection>

          <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white">
              Canal de privacidade
            </h2>
            <p className="mt-3 leading-7 text-zinc-400">
              Para exercer direitos, esclarecer dúvidas ou comunicar uma preocupação
              sobre dados pessoais, envie um e-mail para{" "}
              <a
                className="font-semibold text-red-400 underline underline-offset-4"
                href={`mailto:${privacyEmail}`}
              >
                {privacyEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function PolicySection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <Icon className="size-5" />
        </span>
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-sm leading-7 text-zinc-400 sm:text-base [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">
        {children}
      </div>
    </section>
  );
}
