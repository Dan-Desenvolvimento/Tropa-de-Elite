"use client";

import {
  BarChart3,
  CheckCheck,
  CircleAlert,
  Clock3,
  Eye,
  FileCheck2,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TestTube2,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { FeedbackBanner, type Feedback } from "@/features/whatsapp/components/feedback-banner";
import { MessageWizard } from "@/features/whatsapp/components/message-wizard";
import type {
  AudienceBreakdown,
  Dispatch,
  MessageConfig,
  MessagePreview,
  TestParticipant,
} from "@/features/whatsapp/components/types";
import { WhatsAppPreview } from "@/features/whatsapp/components/whatsapp-preview";

type Tab = "messages" | "history";

export function CommunicationCenter({
  eventId,
  eventName,
  canEdit,
  canSend,
  canViewReports,
  whatsappApiConfigured,
  testParticipants,
}: {
  eventId: string;
  eventName: string;
  canEdit: boolean;
  canSend: boolean;
  canViewReports: boolean;
  whatsappApiConfigured: boolean;
  testParticipants: TestParticipant[];
}) {
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<MessageConfig[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [wizard, setWizard] = useState<MessageConfig | "new" | null>(null);
  const [action, setAction] = useState<{
    message: MessageConfig;
    mode: "preview" | "test" | "bulk";
  } | null>(null);

  const loadMessages = useCallback(async () => {
    const response = await fetch(
      `/api/admin/events/${eventId}/whatsapp-messages`,
      { cache: "no-store" },
    );
    const result = (await response.json().catch(() => null)) as
      | { success: true; data: MessageConfig[] }
      | { success: false; message: string }
      | null;
    setLoading(false);
    if (!response.ok || !result?.success) {
      setFeedback({
        tone: "error",
        message:
          result && !result.success
            ? result.message
            : "Não foi possível carregar as comunicações.",
      });
      return;
    }
    setMessages(result.data);
    if (result.data.length === 0) setHistoryLoading(false);
  }, [eventId]);

  const loadHistory = useCallback(
    async (quiet = false) => {
      if (!canViewReports && !canSend && !canEdit) return;
      const results = await Promise.all(
        messages.map(async (message) => {
          const response = await fetch(
            `/api/admin/events/${eventId}/whatsapp-messages/${message.id}/dispatches`,
            { cache: "no-store" },
          );
          if (!response.ok) return [] as Dispatch[];
          const body = (await response.json().catch(() => null)) as
            | { success: true; data: Dispatch[] }
            | null;
          return body?.success
            ? body.data.map((dispatch) => ({
                ...dispatch,
                messageConfigId: dispatch.messageConfigId ?? message.id,
              }))
            : [];
        }),
      );
      setDispatches(
        results
          .flat()
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          ),
      );
      if (!quiet) setHistoryLoading(false);
    },
    [canEdit, canSend, canViewReports, eventId, messages],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMessages(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory, messages.length]);

  const hasRunningDispatch = dispatches.some((dispatch) =>
    ["queued", "processing"].includes(dispatch.status),
  );

  useEffect(() => {
    if (!hasRunningDispatch) return;
    const timer = window.setInterval(() => void loadHistory(true), 4000);
    return () => window.clearInterval(timer);
  }, [hasRunningDispatch, loadHistory]);

  const activeMessages = messages.filter((message) => message.active).length;
  const latestDispatch = dispatches[0] ?? null;
  const totalRead = dispatches.reduce(
    (total, dispatch) => total + (dispatch.readCount ?? 0),
    0,
  );

  function handleSaved(message: MessageConfig) {
    setMessages((current) => {
      const exists = current.some((item) => item.id === message.id);
      return exists
        ? current.map((item) => (item.id === message.id ? message : item))
        : [...current, message];
    });
    setWizard(null);
    setFeedback({
      tone: "success",
      message: `“${message.displayName}” foi salva e já aparece na sua central.`,
    });
  }

  return (
    <div className="space-y-6 p-5 sm:p-8 lg:p-10">
      {feedback ? (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      ) : null}

      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 sm:p-7">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-400">
              <Sparkles className="size-4" />
              Central inteligente
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Toda a comunicação do evento, em um só lugar.
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Cadastre um modelo aprovado, diga o que entra em cada variável e use quantas vezes precisar — sem alterar código ou fazer um novo deploy.
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setWizard("new")}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500"
            >
              <Plus className="size-4" />
              Nova comunicação
            </button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={FileCheck2}
          label="Mensagens configuradas"
          value={messages.length}
          helper={`${activeMessages} pronta${activeMessages === 1 ? "" : "s"} para uso`}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Integração WhatsApp"
          value={whatsappApiConfigured ? "Conectada" : "Pendente"}
          helper={whatsappApiConfigured ? "Ambiente pronto para enviar" : "Configure as chaves na Vercel"}
          tone={whatsappApiConfigured ? "success" : "warning"}
        />
        <SummaryCard
          icon={CheckCheck}
          label="Leituras registradas"
          value={totalRead}
          helper="Somadas em todos os disparos"
        />
        <SummaryCard
          icon={Clock3}
          label="Último disparo"
          value={latestDispatch ? statusLabel(latestDispatch.status) : "Nenhum"}
          helper={latestDispatch ? formatDate(latestDispatch.createdAt) : "Seu histórico aparecerá aqui"}
          tone={latestDispatch?.status === "failed" ? "warning" : "default"}
        />
      </div>

      {!whatsappApiConfigured ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="size-6 shrink-0 text-amber-300" />
          <div>
            <p className="font-semibold text-amber-100">A central está disponível para configurar e revisar.</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/60">
              O envio ficará liberado assim que a API do WhatsApp estiver configurada no ambiente de produção.
            </p>
          </div>
        </section>
      ) : null}

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.02] p-1.5">
        <TabButton
          active={tab === "messages"}
          icon={MessageCircle}
          label="Mensagens"
          count={messages.length}
          onClick={() => setTab("messages")}
        />
        <TabButton
          active={tab === "history"}
          icon={BarChart3}
          label="Histórico de envios"
          count={dispatches.length}
          onClick={() => setTab("history")}
        />
      </div>

      {tab === "messages" ? (
        <MessagesPanel
          loading={loading}
          messages={messages}
          canEdit={canEdit}
          canSend={canSend}
          whatsappApiConfigured={whatsappApiConfigured}
          onCreate={() => setWizard("new")}
          onEdit={(message) => setWizard(message)}
          onAction={(message, mode) => setAction({ message, mode })}
        />
      ) : (
        <HistoryPanel
          loading={historyLoading}
          dispatches={dispatches}
          messages={messages}
          onRefresh={() => void loadHistory()}
        />
      )}

      {wizard ? (
        <MessageWizard
          eventId={eventId}
          initial={wizard === "new" ? null : wizard}
          onClose={() => setWizard(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {action ? (
        <MessageActionModal
          eventId={eventId}
          eventName={eventName}
          message={action.message}
          initialMode={action.mode}
          canSend={canSend}
          testParticipants={testParticipants}
          onClose={() => setAction(null)}
          onDispatched={(name, eligible) => {
            setAction(null);
            setTab("history");
            setFeedback({
              tone: "success",
              message: `O envio de “${name}” foi iniciado para ${eligible.toLocaleString("pt-BR")} contato${eligible === 1 ? "" : "s"}. Acompanhe o andamento abaixo.`,
            });
            window.setTimeout(() => void loadHistory(), 800);
          }}
        />
      ) : null}
    </div>
  );
}

function MessagesPanel({
  loading,
  messages,
  canEdit,
  canSend,
  whatsappApiConfigured,
  onCreate,
  onEdit,
  onAction,
}: {
  loading: boolean;
  messages: MessageConfig[];
  canEdit: boolean;
  canSend: boolean;
  whatsappApiConfigured: boolean;
  onCreate: () => void;
  onEdit: (message: MessageConfig) => void;
  onAction: (
    message: MessageConfig,
    mode: "preview" | "test" | "bulk",
  ) => void;
}) {
  if (loading) return <LoadingState label="Carregando suas mensagens" />;

  if (messages.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.015] px-5 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <MessageCircle className="size-6" />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">Crie sua primeira comunicação</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
          O assistente guiará você pelo modelo da Meta, imagem, variáveis e botão. Leva poucos minutos.
        </p>
        {canEdit ? (
          <button
            type="button"
            onClick={onCreate}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-500"
          >
            <Plus className="size-4" />
            Começar configuração
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {messages.map((message) => (
        <article
          key={message.id}
          className="group rounded-[26px] border border-white/8 bg-white/[0.025] p-5 transition hover:border-white/15 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill active={message.active} />
                <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  {message.templateLanguage}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">{message.displayName}</h3>
              <p className="mt-2 min-h-10 text-sm leading-5 text-zinc-500">
                {message.description || "Comunicação configurada para este evento."}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <MessageCircle className="size-5" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <InfoBlock label="Modelo aprovado" value={message.templateName} mono />
            <InfoBlock
              label="Conteúdo dinâmico"
              value={`${message.bodyVariables.length} variável${message.bodyVariables.length === 1 ? "" : "is"}`}
            />
            <InfoBlock
              label="Cabeçalho"
              value={message.headerKind === "image" ? "Com imagem" : "Somente texto"}
            />
            <InfoBlock
              label="Botão"
              value={
                message.buttonConfig.mode === "none"
                  ? "Sem botão"
                  : message.buttonConfig.label
              }
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={() => onAction(message, "preview")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <Eye className="size-3.5" />
              Prévia
            </button>
            {canEdit ? (
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                <Pencil className="size-3.5" />
                Editar
              </button>
            ) : null}
            {canSend ? (
              <button
                type="button"
                onClick={() => onAction(message, "test")}
                disabled={!message.active || !whatsappApiConfigured}
                title={!message.active ? "Ative a comunicação antes de testar" : undefined}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-500/25 px-3.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <TestTube2 className="size-3.5" />
                Testar
              </button>
            ) : null}
            {canSend ? (
              <button
                type="button"
                onClick={() => onAction(message, "bulk")}
                disabled={!message.active || !whatsappApiConfigured}
                className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <Send className="size-3.5" />
                Enviar
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function MessageActionModal({
  eventId,
  eventName,
  message,
  initialMode,
  canSend,
  testParticipants,
  onClose,
  onDispatched,
}: {
  eventId: string;
  eventName: string;
  message: MessageConfig;
  initialMode: "preview" | "test" | "bulk";
  canSend: boolean;
  testParticipants: TestParticipant[];
  onClose: () => void;
  onDispatched: (name: string, eligible: number) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [participantId, setParticipantId] = useState(
    testParticipants[0]?.id ?? "",
  );
  const [preview, setPreview] = useState<MessagePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyAttempt = useRef<{
    fingerprint: string;
    key: string;
  } | null>(null);

  const loadPreview = useCallback(async () => {
    const response = await fetch(
      `/api/admin/events/${eventId}/whatsapp-messages/${message.id}/preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          participantId ? { registrationId: participantId } : {},
        ),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { success: true; data: MessagePreview }
      | { success: false; message: string }
      | null;
    setLoading(false);
    if (!response.ok || !result?.success) {
      setError(
        result && !result.success
          ? result.message
          : "Não foi possível montar a prévia.",
      );
      return;
    }
    setPreview(result.data);
  }, [eventId, message.id, participantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPreview(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPreview]);

  async function dispatch() {
    const scope = mode === "test" ? "test" : "bulk";
    if (scope === "test" && !participantId) {
      setError("Escolha uma pessoa para receber o teste.");
      return;
    }

    const fingerprint = `${scope}:${scope === "test" ? participantId : "all"}`;
    const idempotencyKey =
      idempotencyAttempt.current?.fingerprint === fingerprint
        ? idempotencyAttempt.current.key
        : crypto.randomUUID();
    idempotencyAttempt.current = { fingerprint, key: idempotencyKey };

    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/whatsapp-messages/${message.id}/dispatches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            registrationId: scope === "test" ? participantId : undefined,
            idempotencyKey,
          }),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | {
            success: true;
            data: { eligible_count?: number; eligibleCount?: number };
          }
        | { success: false; message: string }
        | null;

      // Uma resposta HTTP encerra esta tentativa. Um novo clique após uma
      // resposta definitiva representa uma nova intenção e recebe outra chave.
      idempotencyAttempt.current = null;
      if (!response.ok || !result?.success) {
        setError(
          result && !result.success
            ? result.message
            : "Não foi possível iniciar o envio.",
        );
        return;
      }
      onDispatched(
        message.displayName,
        result.data.eligibleCount ??
          result.data.eligible_count ??
          (scope === "test" ? 1 : preview?.audience.eligible ?? 0),
      );
    } catch {
      // Sem resposta não é possível saber se o servidor recebeu a solicitação.
      // A próxima tentativa com o mesmo público reutiliza a chave e evita duplicar.
      setError(
        "A conexão foi interrompida e não foi possível confirmar o envio. Tente novamente: a central verificará a mesma solicitação com segurança.",
      );
    } finally {
      setPending(false);
    }
  }

  const audience = preview?.audience;
  const selectedParticipant = testParticipants.find(
    (participant) => participant.id === participantId,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6"
    >
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c0f] shadow-2xl shadow-black/70">
        <header className="flex items-start justify-between gap-5 border-b border-white/8 p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
              {eventName}
            </p>
            <h2 id="action-title" className="mt-2 text-2xl font-semibold text-white">
              {message.displayName}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Confira a mensagem com dados reais protegidos antes de enviar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl border border-white/10 p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.02] p-1.5">
              <ActionTab
                active={mode === "preview"}
                label="Somente visualizar"
                icon={Eye}
                onClick={() => setMode("preview")}
              />
              {canSend ? (
                <ActionTab
                  active={mode === "test"}
                  label="Enviar teste"
                  icon={TestTube2}
                  onClick={() => setMode("test")}
                />
              ) : null}
              {canSend ? (
                <ActionTab
                  active={mode === "bulk"}
                  label="Envio em massa"
                  icon={UsersRound}
                  onClick={() => setMode("bulk")}
                />
              ) : null}
            </div>

            <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h3 className="font-semibold text-white">
                {mode === "bulk"
                  ? "Público deste disparo"
                  : "Pessoa usada na prévia"}
              </h3>
              {mode !== "bulk" ? (
                <label className="mt-4 block text-sm text-zinc-400">
                  Participante
                  <select
                    value={participantId}
                    onChange={(event) => setParticipantId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-300 outline-none focus:border-red-500/60"
                  >
                    {testParticipants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name} · {participant.ticketCode}
                      </option>
                    ))}
                  </select>
                </label>
              ) : audience ? (
                <AudienceGrid audience={audience} />
              ) : null}

              {mode === "test" && selectedParticipant ? (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs leading-5 text-emerald-200/80">
                  Apenas {selectedParticipant.name} receberá esta mensagem. O teste ficará registrado no histórico.
                </div>
              ) : null}

              {mode === "bulk" ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-100/70">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  Somente inscritos confirmados, com telefone válido e consentimento para comunicações serão incluídos.
                </div>
              ) : null}
            </section>

            {error ? (
              <div role="alert" className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl border border-white/10 px-5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
              >
                Fechar
              </button>
              {canSend && mode !== "preview" ? (
                <button
                  type="button"
                  onClick={() => void dispatch()}
                  disabled={
                    pending ||
                    loading ||
                    (mode === "test" && !participantId) ||
                    (mode === "bulk" && !audience?.eligible)
                  }
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 ${
                    mode === "test"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {pending
                    ? "Iniciando envio"
                    : mode === "test"
                      ? "Enviar somente o teste"
                      : `Confirmar envio para ${audience?.eligible ?? 0}`}
                </button>
              ) : null}
            </div>
          </div>

          <div>
            {loading ? (
              <LoadingState label="Montando prévia com dados do evento" compact />
            ) : preview ? (
              <>
                <WhatsAppPreview
                  body={preview.body}
                  headerMediaUrl={preview.headerMediaUrl}
                  buttonLabel={preview.buttonLabel}
                  buttonUrl={preview.buttonUrl}
                />
                <p className="mt-3 text-center text-[11px] text-zinc-600">
                  Prévia baseada em {preview.participant.name} · {preview.participant.phone}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({
  loading,
  dispatches,
  messages,
  onRefresh,
}: {
  loading: boolean;
  dispatches: Dispatch[];
  messages: MessageConfig[];
  onRefresh: () => void;
}) {
  if (loading) return <LoadingState label="Atualizando histórico" />;

  return (
    <section className="overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.02]">
      <header className="flex flex-col gap-4 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="font-semibold text-white">Histórico de envios</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Aceite da Meta, entrega e leitura são atualizados pelo webhook.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-semibold text-zinc-300 hover:bg-white/5"
        >
          <RefreshCw className="size-3.5" />
          Atualizar
        </button>
      </header>

      {dispatches.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <Clock3 className="mx-auto size-7 text-zinc-700" />
          <p className="mt-4 text-sm font-medium text-zinc-400">Nenhum envio registrado nesta central.</p>
          <p className="mt-2 text-xs text-zinc-600">Quando um teste ou disparo for iniciado, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/8">
          {dispatches.map((dispatch) => {
            const message = messages.find(
              (item) => item.id === dispatch.messageConfigId,
            );
            const progress = dispatch.eligibleCount
              ? Math.min(
                  100,
                  (dispatch.processedCount / dispatch.eligibleCount) * 100,
                )
              : 0;
            return (
              <article key={dispatch.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <DispatchStatus status={dispatch.status} />
                      <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        {scopeLabel(dispatch.scope)}
                      </span>
                    </div>
                    <h4 className="mt-3 truncate font-semibold text-white">
                      {message?.displayName ?? "Comunicação removida"}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-600">{formatDate(dispatch.createdAt)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
                    <HistoryMetric label="Elegíveis" value={dispatch.eligibleCount} />
                    <HistoryMetric label="Aceitos" value={dispatch.sentCount} />
                    <HistoryMetric label="Entregues" value={dispatch.deliveredCount ?? 0} />
                    <HistoryMetric label="Lidos" value={dispatch.readCount ?? 0} />
                  </div>
                </div>

                {["queued", "processing"].includes(dispatch.status) ? (
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-[11px] text-zinc-600">
                      <span>Processando com segurança</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {dispatch.failedCount > 0 || dispatch.errorMessage ? (
                  <p className="mt-4 text-xs leading-5 text-red-300/80">
                    {dispatch.failedCount.toLocaleString("pt-BR")} falha{dispatch.failedCount === 1 ? "" : "s"}
                    {dispatch.errorMessage ? ` · ${dispatch.errorMessage}` : ""}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AudienceGrid({ audience }: { audience: AudienceBreakdown }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <AudienceItem label="Inscritos" value={audience.total} />
      <AudienceItem label="Receberão" value={audience.eligible} tone="success" />
      <AudienceItem label="Sem consentimento" value={audience.withoutConsent} />
      <AudienceItem label="Não confirmados" value={audience.notConfirmed} />
      <AudienceItem label="Telefone inválido" value={audience.invalidPhone} />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: typeof MessageCircle;
  label: string;
  value: string | number;
  helper: string;
  tone?: "default" | "success" | "warning";
}) {
  const iconTone =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-400"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-400"
        : "bg-red-500/10 text-red-400";
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
      <div className={`flex size-10 items-center justify-center rounded-xl ${iconTone}`}>
        <Icon className="size-4.5" />
      </div>
      <p className="mt-5 text-2xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      <p className="mt-1 text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-2 text-[11px] leading-4 text-zinc-700">{helper}</p>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: typeof MessageCircle;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? "bg-white/10 text-white"
          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
      }`}
    >
      <Icon className={active ? "size-4 text-red-500" : "size-4"} />
      {label}
      <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-zinc-500">
        {count}
      </span>
    </button>
  );
}

function ActionTab({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof Eye;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition ${
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function InfoBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">{label}</p>
      <p className={`mt-2 truncate text-zinc-300 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
        active
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-zinc-500/10 text-zinc-500"
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-zinc-600"}`} />
      {active ? "Pronta" : "Desativada"}
    </span>
  );
}

function DispatchStatus({ status }: { status: Dispatch["status"] }) {
  const tone =
    status === "completed"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "partial"
        ? "bg-amber-500/10 text-amber-400"
        : status === "failed" || status === "cancelled"
          ? "bg-red-500/10 text-red-400"
          : "bg-sky-500/10 text-sky-400";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tone}`}>
      {["queued", "processing"].includes(status) ? (
        <LoaderCircle className="size-3 animate-spin" />
      ) : null}
      {statusLabel(status)}
    </span>
  );
}

function HistoryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3">
      <p className="text-lg font-semibold text-white">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-zinc-700">{label}</p>
    </div>
  );
}

function AudienceItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3">
      <p className={`text-xl font-semibold ${tone === "success" ? "text-emerald-400" : "text-white"}`}>
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-zinc-600">{label}</p>
    </div>
  );
}

function LoadingState({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center gap-3 rounded-[26px] border border-white/8 bg-white/[0.02] text-sm text-zinc-500 ${compact ? "min-h-72 p-5" : "min-h-56 p-8"}`}>
      <LoaderCircle className="size-5 animate-spin text-red-500" />
      {label}
    </div>
  );
}

function statusLabel(status: Dispatch["status"]) {
  return {
    queued: "Na fila",
    processing: "Enviando",
    completed: "Concluído",
    partial: "Concluído com falhas",
    failed: "Falhou",
    cancelled: "Cancelado",
  }[status];
}

function scopeLabel(scope: Dispatch["scope"]) {
  return {
    bulk: "Envio em massa",
    test: "Teste",
    individual: "Individual",
  }[scope];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
