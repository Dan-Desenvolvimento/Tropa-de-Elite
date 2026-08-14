"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  ImagePlus,
  LoaderCircle,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  configuredButtonExample,
  extractVariablePositions,
  variableOption,
  WHATSAPP_BUTTON_VARIABLE_OPTIONS,
  WHATSAPP_VARIABLE_OPTIONS,
  type WhatsAppButtonConfig,
  type WhatsAppVariableSource,
} from "@/features/whatsapp/message-config";
import type {
  MessageConfig,
  MessageDraft,
} from "@/features/whatsapp/components/types";
import { WhatsAppPreview } from "@/features/whatsapp/components/whatsapp-preview";
import { createClient } from "@/lib/supabase/client";

const steps = [
  { title: "Objetivo", description: "Como sua equipe reconhecerá a mensagem" },
  { title: "Modelo Meta", description: "Os dados do modelo que foi aprovado" },
  { title: "Aparência", description: "Imagem ou vídeo que acompanha a comunicação" },
  { title: "Variáveis", description: "O que entra em cada espaço {{n}}" },
  { title: "Revisão", description: "Confira tudo antes de salvar" },
];

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-500/60";

export function MessageWizard({
  eventId,
  initial,
  onClose,
  onSaved,
}: {
  eventId: string;
  initial: MessageConfig | null;
  onClose: () => void;
  onSaved: (message: MessageConfig) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<MessageDraft>(() =>
    initial
      ? {
          displayName: initial.displayName,
          description: initial.description,
          templateName: initial.templateName,
          templateLanguage: initial.templateLanguage,
          previewBody: initial.previewBody,
          headerKind: initial.headerKind,
          headerMediaUrl: initial.headerMediaUrl,
          bodyVariables: initial.bodyVariables,
          buttonConfig: initial.buttonConfig,
          active: initial.active,
        }
      : {
          displayName: "",
          description: "",
          templateName: "",
          templateLanguage: "pt_BR",
          previewBody: "",
          headerKind: "none",
          headerMediaUrl: null,
          bodyVariables: [],
          buttonConfig: { mode: "none" },
          active: true,
        },
  );
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaByKind = useRef<{ image: string | null; video: string | null }>({
    image: initial?.headerKind === "image" ? initial.headerMediaUrl : null,
    video: initial?.headerKind === "video" ? initial.headerMediaUrl : null,
  });

  const positions = useMemo(
    () => extractVariablePositions(draft.previewBody),
    [draft.previewBody],
  );
  const localPreview = useMemo(() => {
    let body = draft.previewBody;
    for (const variable of draft.bodyVariables) {
      const option = variableOption(variable.source);
      body = body.replaceAll(
        `{{${variable.position}}}`,
        variable.source === "fixed.text"
          ? variable.value ?? "Texto personalizado"
          : option?.sample ?? "Exemplo",
      );
    }
    return body;
  }, [draft.bodyVariables, draft.previewBody]);

  function update<K extends keyof MessageDraft>(
    key: K,
    value: MessageDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function synchronizeVariables(body: string) {
    const nextPositions = extractVariablePositions(body);
    const existing = new Map(
      draft.bodyVariables.map((variable) => [variable.position, variable]),
    );
    update(
      "bodyVariables",
      nextPositions.map(
        (position) =>
          existing.get(position) ?? {
            position,
            source: defaultSource(position),
          },
      ),
    );
  }

  function validateCurrentStep() {
    if (step === 0 && draft.displayName.trim().length < 3) {
      return "Dê um nome simples, como “Localização do evento”.";
    }
    if (step === 1) {
      if (!/^[a-z0-9_]{1,512}$/.test(draft.templateName)) {
        return "Copie exatamente o nome técnico aprovado na Meta, usando letras minúsculas e sublinhado.";
      }
      if (!draft.previewBody.trim()) {
        return "Cole o corpo completo do modelo aprovado para montarmos a prévia.";
      }
    }
    if (
      step === 2 &&
      draft.headerKind !== "none" &&
      !draft.headerMediaUrl
    ) {
      return draft.headerKind === "video"
        ? "Envie o vídeo MP4 que será usado no cabeçalho."
        : "Envie a imagem que será usada no cabeçalho.";
    }
    if (step === 3) {
      if (draft.bodyVariables.length !== positions.length) {
        return "Configure todas as variáveis encontradas no texto.";
      }
      if (
        draft.bodyVariables.some(
          (variable) =>
            variable.source === "fixed.text" && !variable.value?.trim(),
        )
      ) {
        return "Preencha o conteúdo das variáveis marcadas como texto fixo.";
      }
      if (
        draft.buttonConfig.mode === "dynamic" &&
        !draft.buttonConfig.baseUrl.trim()
      ) {
        return "Informe a URL-base cadastrada no botão do modelo da Meta.";
      }
      if (
        draft.buttonConfig.mode === "dynamic" &&
        draft.buttonConfig.source === "fixed.text" &&
        !draft.buttonConfig.value?.trim()
      ) {
        return "Preencha o complemento fixo usado no botão.";
      }
    }
    return null;
  }

  function next() {
    const message = validateCurrentStep();
    if (message) {
      setError(message);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
    setError(null);
  }

  function selectHeaderKind(kind: MessageDraft["headerKind"]) {
    if (draft.headerKind !== "none") {
      mediaByKind.current[draft.headerKind] = draft.headerMediaUrl;
    }
    update("headerKind", kind);
    update(
      "headerMediaUrl",
      kind === "none" ? null : mediaByKind.current[kind],
    );
  }

  async function uploadMedia(file: File) {
    const isVideo = draft.headerKind === "video";
    const allowed = isVideo
      ? file.type === "video/mp4" && file.size <= 16 * 1024 * 1024
      : ["image/png", "image/jpeg"].includes(file.type) &&
        file.size <= 5 * 1024 * 1024;
    if (!allowed || file.size <= 0) {
      setError(
        isVideo
          ? "Use um vídeo MP4 de até 16 MB, preferencialmente H.264 com áudio AAC ou sem áudio."
          : "Use uma imagem PNG ou JPG de até 5 MB.",
      );
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const prepareResponse = await fetch(`/api/admin/events/${eventId}/whatsapp-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      const prepared = (await prepareResponse.json().catch(() => null)) as
        | {
            success: true;
            data: {
              path: string;
              token: string;
              signedUrl: string;
              kind: "image" | "video";
            };
          }
        | { success: false; message: string }
        | null;
      if (!prepareResponse.ok || !prepared?.success) {
        setError(
          prepared && !prepared.success
            ? prepared.message
            : `Não foi possível preparar ${isVideo ? "o vídeo" : "a imagem"} para envio.`,
        );
        return;
      }
      if (prepared.data.kind !== draft.headerKind) {
        setError(
          `O arquivo foi reconhecido como ${prepared.data.kind === "video" ? "vídeo" : "imagem"}, mas o cabeçalho está configurado como ${isVideo ? "vídeo" : "imagem"}.`,
        );
        return;
      }

      const { error: uploadError } = await createClient()
        .storage
        .from("whatsapp-media")
        .uploadToSignedUrl(prepared.data.path, prepared.data.token, file, {
          contentType: file.type,
        });
      if (uploadError) {
        setError(
          `Não foi possível enviar ${isVideo ? "o vídeo" : "a imagem"} para o armazenamento. Tente novamente.`,
        );
        return;
      }

      const finalizeResponse = await fetch(`/api/admin/events/${eventId}/whatsapp-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", path: prepared.data.path }),
      });
      const finalized = (await finalizeResponse.json().catch(() => null)) as
        | { success: true; data: { url: string; kind: "image" | "video" } }
        | { success: false; message: string }
        | null;
      if (!finalizeResponse.ok || !finalized?.success) {
        setError(
          finalized && !finalized.success
            ? finalized.message
            : "O arquivo foi enviado, mas não foi possível concluir a preparação. Tente novamente.",
        );
        return;
      }
      if (finalized.data.kind !== draft.headerKind) {
        setError("O tipo de mídia finalizado não corresponde ao cabeçalho escolhido.");
        return;
      }

      mediaByKind.current[isVideo ? "video" : "image"] = finalized.data.url;
      update("headerMediaUrl", finalized.data.url);
    } catch {
      setError(
        `A conexão foi interrompida durante o envio ${isVideo ? "do vídeo" : "da imagem"}. Tente novamente.`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setPending(true);
    setError(null);
    const response = await fetch(
      initial
        ? `/api/admin/events/${eventId}/whatsapp-messages/${initial.id}`
        : `/api/admin/events/${eventId}/whatsapp-messages`,
      {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { success: true; data: MessageConfig }
      | { success: false; message: string }
      | null;
    setPending(false);
    if (!response.ok || !result?.success) {
      setError(
        result && !result.success
          ? result.message
          : "Não foi possível salvar a comunicação.",
      );
      return;
    }
    onSaved(result.data);
  }

  const buttonLabel =
    draft.buttonConfig.mode === "none"
      ? null
      : draft.buttonConfig.label || "Botão do modelo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6"
    >
      <div className="mx-auto min-h-full max-w-6xl rounded-[28px] border border-white/10 bg-[#0c0c0f] shadow-2xl shadow-black/70">
        <header className="flex items-start justify-between gap-5 border-b border-white/8 p-5 sm:p-7">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-500">
              <Sparkles className="size-4" />
              Assistente de configuração
            </div>
            <h2 id="wizard-title" className="mt-2 text-2xl font-semibold text-white">
              {initial ? "Editar comunicação" : "Nova comunicação"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Siga as etapas. O sistema traduz as variáveis da Meta para informações fáceis de reconhecer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar assistente"
            className="rounded-xl border border-white/10 p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
          <nav aria-label="Etapas" className="border-b border-white/8 p-4 lg:border-b-0 lg:border-r lg:p-6">
            <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {steps.map((item, index) => (
                <li key={item.title} className="min-w-[155px] lg:min-w-0">
                  <button
                    type="button"
                    onClick={() => index < step && setStep(index)}
                    disabled={index > step}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition ${
                      index === step
                        ? "bg-red-500/10"
                        : index < step
                          ? "hover:bg-white/5"
                          : "opacity-40"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        index < step
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : index === step
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-white/10 text-zinc-600"
                      }`}
                    >
                      {index < step ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{item.title}</span>
                      <span className="mt-1 hidden text-xs leading-5 text-zinc-600 lg:block">
                        {item.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 p-5 sm:p-7 lg:p-9">
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">
                Etapa {step + 1} de {steps.length}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{steps[step].title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{steps[step].description}</p>

              <div className="mt-7">
                {step === 0 ? (
                  <PurposeStep draft={draft} update={update} />
                ) : step === 1 ? (
                  <TemplateStep
                    draft={draft}
                    update={update}
                    synchronizeVariables={synchronizeVariables}
                  />
                ) : step === 2 ? (
                  <AppearanceStep
                    draft={draft}
                    uploading={uploading}
                    selectHeaderKind={selectHeaderKind}
                    uploadMedia={uploadMedia}
                  />
                ) : step === 3 ? (
                  <VariablesStep draft={draft} update={update} />
                ) : (
                  <ReviewStep
                    draft={draft}
                    previewBody={localPreview}
                    buttonLabel={buttonLabel}
                  />
                )}
              </div>

              {error ? (
                <div role="alert" className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                  {error}
                </div>
              ) : null}

              <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => (step === 0 ? onClose() : setStep((current) => current - 1))}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                >
                  <ArrowLeft className="size-4" />
                  {step === 0 ? "Cancelar" : "Voltar"}
                </button>

                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-500"
                  >
                    Continuar
                    <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={pending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:bg-zinc-800"
                  >
                    {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {pending ? "Salvando" : initial ? "Salvar alterações" : "Criar comunicação"}
                  </button>
                )}
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurposeStep({
  draft,
  update,
}: {
  draft: MessageDraft;
  update: UpdateDraft;
}) {
  return (
    <div className="space-y-5">
      <Field label="Nome para sua equipe" hint="Exemplo: Localização do evento ou Lembrete de ingresso">
        <input
          value={draft.displayName}
          onChange={(event) => update("displayName", event.target.value)}
          className={inputClass}
          placeholder="Localização do evento"
          maxLength={80}
          autoFocus
        />
      </Field>
      <Field label="Descrição curta (opcional)" hint="Explique quando esta mensagem deve ser usada.">
        <textarea
          value={draft.description ?? ""}
          onChange={(event) => update("description", event.target.value)}
          className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-red-500/60"
          placeholder="Envie no dia anterior para ajudar os participantes a encontrar o local."
          maxLength={240}
        />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(event) => update("active", event.target.checked)}
          className="mt-0.5 size-4 accent-red-600"
        />
        <span>
          <span className="block text-sm font-semibold text-white">Deixar pronta para uso</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Desative se ainda estiver aguardando a aprovação do modelo na Meta.
          </span>
        </span>
      </label>
    </div>
  );
}

function TemplateStep({
  draft,
  update,
  synchronizeVariables,
}: {
  draft: MessageDraft;
  update: UpdateDraft;
  synchronizeVariables: (body: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
        <Field label="Nome técnico aprovado na Meta" hint="Está na coluna “Nome do modelo” do WhatsApp Manager.">
          <input
            value={draft.templateName}
            onChange={(event) => update("templateName", event.target.value.trim())}
            className={inputClass}
            placeholder="localizacao_evento"
          />
        </Field>
        <Field label="Idioma" hint="Normalmente pt_BR">
          <select
            value={draft.templateLanguage}
            onChange={(event) => update("templateLanguage", event.target.value)}
            className={inputClass}
          >
            <option value="pt_BR">Português (BR)</option>
            <option value="en_US">Inglês (EUA)</option>
            <option value="es">Espanhol</option>
          </select>
        </Field>
      </div>

      <Field
        label="Corpo exato do modelo"
        hint="Cole o texto aprovado, mantendo {{1}}, {{2}} e as demais variáveis nos mesmos lugares."
      >
        <textarea
          value={draft.previewBody}
          onChange={(event) => {
            const body = event.target.value;
            update("previewBody", body);
            synchronizeVariables(body);
          }}
          className="mt-2 min-h-72 w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-red-500/60"
          placeholder={"Olá, {{1}}!\n\nO evento {{2}} será em {{3}}, às {{4}}.\n\nLocal: {{5}}"}
        />
      </Field>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs leading-6 text-sky-100/80">
        As chaves não recebem significado automaticamente. Na próxima etapa você dirá ao sistema o que colocar em cada uma, de forma visual.
      </div>
    </div>
  );
}

function AppearanceStep({
  draft,
  uploading,
  selectHeaderKind,
  uploadMedia,
}: {
  draft: MessageDraft;
  uploading: boolean;
  selectHeaderKind: (kind: MessageDraft["headerKind"]) => void;
  uploadMedia: (file: File) => Promise<void>;
}) {
  const isVideo = draft.headerKind === "video";
  const hasMedia = Boolean(draft.headerMediaUrl);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <ChoiceCard
          active={draft.headerKind === "none"}
          title="Sem mídia"
          description="Use quando o modelo aprovado possui apenas texto."
          onClick={() => selectHeaderKind("none")}
          disabled={uploading}
        />
        <ChoiceCard
          active={draft.headerKind === "image"}
          title="Imagem no cabeçalho"
          description="Ideal para mapa, identidade do evento ou orientação visual."
          onClick={() => selectHeaderKind("image")}
          disabled={uploading}
        />
        <ChoiceCard
          active={draft.headerKind === "video"}
          title="Vídeo no cabeçalho"
          description="Use exatamente quando o modelo aprovado na Meta possui vídeo."
          onClick={() => selectHeaderKind("video")}
          disabled={uploading}
        />
      </div>

      {draft.headerKind !== "none" ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div>
              <div className="flex items-start gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isVideo ? "bg-violet-500/10 text-violet-300" : "bg-sky-500/10 text-sky-300"}`}>
                  {isVideo ? <Film className="size-4.5" /> : <ImagePlus className="size-4.5" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {isVideo ? "Vídeo aprovado pela Meta" : "Imagem aprovada pela Meta"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {isVideo
                      ? "Somente MP4, até 16 MB. Recomendamos H.264 com um único áudio AAC ou sem áudio."
                      : "PNG ou JPG, até 5 MB. Prefira formato horizontal para evitar cortes no WhatsApp."}
                  </p>
                </div>
              </div>

              <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
                {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading
                  ? `Enviando ${isVideo ? "vídeo" : "imagem"}`
                  : hasMedia
                    ? `Trocar ${isVideo ? "vídeo" : "imagem"}`
                    : `Escolher ${isVideo ? "vídeo" : "imagem"}`}
                <input
                  type="file"
                  accept={isVideo ? "video/mp4,.mp4" : "image/png,image/jpeg,.png,.jpg,.jpeg"}
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadMedia(file);
                    event.currentTarget.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            {draft.headerMediaUrl ? (
              <MediaThumb
                kind={draft.headerKind}
                url={draft.headerMediaUrl}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] text-xs text-zinc-700">
                A prévia aparecerá aqui
              </div>
            )}
          </div>
          {hasMedia ? (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
              <Check className="size-4 shrink-0" />
              {isVideo ? "Vídeo" : "Imagem"} carregado e pronto para uso.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-xs leading-5 text-amber-100/70">
        O tipo escolhido precisa ser igual ao cabeçalho do modelo aprovado na Meta. Um modelo de imagem não aceita vídeo, e um modelo de vídeo não aceita imagem.
      </div>
    </div>
  );
}

function MediaThumb({
  kind,
  url,
}: {
  kind: Exclude<MessageDraft["headerKind"], "none">;
  url: string;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
      {kind === "video" ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          {...{ referrerPolicy: "no-referrer" }}
          className="size-full object-contain"
          aria-label="Prévia do vídeo selecionado"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Prévia da imagem selecionada"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      )}
    </div>
  );
}

function VariablesStep({
  draft,
  update,
}: {
  draft: MessageDraft;
  update: UpdateDraft;
}) {
  function updateVariable(position: number, values: Partial<MessageDraft["bodyVariables"][number]>) {
    update(
      "bodyVariables",
      draft.bodyVariables.map((variable) =>
        variable.position === position ? { ...variable, ...values } : variable,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h4 className="font-semibold text-white">Conteúdo das variáveis</h4>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-500">
            {draft.bodyVariables.length} configurada{draft.bodyVariables.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Escolha o dado correto para cada posição. Usaremos as informações do evento e de cada participante automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        {draft.bodyVariables.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm text-zinc-500">
            Este modelo não possui variáveis no corpo. Você pode continuar.
          </div>
        ) : (
          draft.bodyVariables.map((variable) => (
            <div
              key={variable.position}
              className="grid gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:grid-cols-[90px_1fr]"
            >
              <div className="flex h-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 font-mono text-sm font-bold text-red-300">
                {`{{${variable.position}}}`}
              </div>
              <div>
                <select
                  value={variable.source}
                  onChange={(event) =>
                    updateVariable(variable.position, {
                      source: event.target.value as WhatsAppVariableSource,
                      value: undefined,
                    })
                  }
                  aria-label={`Conteúdo da variável ${variable.position}`}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-300 outline-none focus:border-red-500/60"
                >
                  {WHATSAPP_VARIABLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {variable.source === "fixed.text" ? (
                  <input
                    value={variable.value ?? ""}
                    onChange={(event) => updateVariable(variable.position, { value: event.target.value })}
                    className={inputClass}
                    placeholder="Digite o texto que sempre será enviado"
                  />
                ) : (
                  <p className="mt-2 text-xs text-zinc-600">
                    Exemplo: {variableOption(variable.source)?.sample}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ButtonEditor
        value={draft.buttonConfig}
        onChange={(buttonConfig) => update("buttonConfig", buttonConfig)}
      />
    </div>
  );
}

function ButtonEditor({
  value,
  onChange,
}: {
  value: WhatsAppButtonConfig;
  onChange: (value: WhatsAppButtonConfig) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <h4 className="font-semibold text-white">Botão do modelo</h4>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Configure apenas o complemento dinâmico. O endereço principal continua sendo o aprovado na Meta.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <ChoiceCard
          active={value.mode === "none"}
          title="Sem botão"
          description="O modelo não possui botão."
          onClick={() => onChange({ mode: "none" })}
          small
        />
        <ChoiceCard
          active={value.mode === "static"}
          title="Link fixo"
          description="O endereço completo já está na Meta."
          onClick={() => onChange({ mode: "static", label: "ABRIR LINK" })}
          small
        />
        <ChoiceCard
          active={value.mode === "dynamic"}
          title="Link personalizado"
          description="Cada pessoa recebe um complemento diferente."
          onClick={() =>
            onChange({
              mode: "dynamic",
              index: 0,
              label: "ABRIR LINK",
              baseUrl: "https://tropa.filipezetech.com/ingresso",
              source: "participant.ticket_path",
              transform: "leading_slash",
            })
          }
          small
        />
      </div>

      {value.mode !== "none" ? (
        <Field label="Texto exibido no botão" hint="Use o mesmo texto cadastrado no modelo da Meta.">
          <input
            value={value.label}
            onChange={(event) => onChange({ ...value, label: event.target.value })}
            className={inputClass}
            placeholder="ABRIR NO MAPA"
            maxLength={40}
          />
        </Field>
      ) : null}

      {value.mode === "dynamic" ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label="URL-base aprovada na Meta"
              hint="Copie apenas a parte fixa cadastrada no botão. Exemplo: https://tropa.filipezetech.com/ingresso"
            >
              <input
                value={value.baseUrl}
                onChange={(event) => onChange({ ...value, baseUrl: event.target.value })}
                className={inputClass}
                placeholder="https://tropa.filipezetech.com/ingresso"
                inputMode="url"
              />
            </Field>
          </div>
          <Field label="Informação usada no link" hint="Para ingresso, escolha o complemento do link do ingresso.">
            <select
              value={value.source}
              onChange={(event) =>
                onChange({
                  ...value,
                  source: event.target.value as WhatsAppVariableSource,
                  value: undefined,
                })
              }
              className={inputClass}
            >
              {WHATSAPP_BUTTON_VARIABLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ajuste do endereço" hint="Use “Adicionar /” quando a URL base termina sem barra.">
            <select
              value={value.transform}
              onChange={(event) =>
                onChange({
                  ...value,
                  transform: event.target.value as "none" | "leading_slash",
                })
              }
              className={inputClass}
            >
              <option value="none">Usar exatamente como está</option>
              <option value="leading_slash">Adicionar / antes do complemento</option>
            </select>
          </Field>
          {value.source === "fixed.text" ? (
            <div className="sm:col-span-2">
              <Field label="Complemento fixo">
                <input
                  value={value.value ?? ""}
                  onChange={(event) => onChange({ ...value, value: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
          ) : null}
          <div className="sm:col-span-2 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-400">
              Link final de exemplo
            </p>
            <p className="mt-2 break-all font-mono text-xs leading-5 text-sky-100/80">
              {configuredButtonExample(value) ?? "Complete a configuração do botão."}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-zinc-600">
              O sistema envia à Meta somente o complemento dinâmico. Esta prévia confirma se a barra e o endereço final ficarão corretos.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewStep({
  draft,
  previewBody,
  buttonLabel,
}: {
  draft: MessageDraft;
  previewBody: string;
  buttonLabel: string | null;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <ReviewRow label="Nome para a equipe" value={draft.displayName} />
        <ReviewRow label="Modelo Meta" value={draft.templateName} mono />
        <ReviewRow label="Idioma" value={draft.templateLanguage} />
        <ReviewRow
          label="Cabeçalho"
          value={
            draft.headerKind === "image"
              ? "Imagem"
              : draft.headerKind === "video"
                ? "Vídeo MP4"
                : "Sem mídia"
          }
        />
        <ReviewRow
          label="Variáveis"
          value={`${draft.bodyVariables.length} configurada${draft.bodyVariables.length === 1 ? "" : "s"}`}
        />
        <ReviewRow
          label="Botão"
          value={buttonLabel ?? "Sem botão"}
        />
        {draft.buttonConfig.mode === "dynamic" ? (
          <ReviewRow
            label="Link final de exemplo"
            value={configuredButtonExample(draft.buttonConfig) ?? "Não configurado"}
            mono
          />
        ) : null}
        <ReviewRow
          label="Disponibilidade"
          value={draft.active ? "Pronta para uso" : "Desativada"}
        />
      </div>
      <WhatsAppPreview
        body={previewBody}
        headerKind={draft.headerKind}
        headerMediaUrl={draft.headerMediaUrl}
        buttonLabel={buttonLabel}
        buttonUrl={
          draft.buttonConfig.mode === "dynamic"
            ? configuredButtonExample(draft.buttonConfig)
            : null
        }
        compact
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-300">
      {label}
      {hint ? <span className="mt-1 block text-xs font-normal leading-5 text-zinc-600">{hint}</span> : null}
      {children}
    </label>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  onClick,
  small = false,
  disabled = false,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border text-left transition disabled:cursor-wait disabled:opacity-50 ${small ? "p-4" : "p-5"} ${
        active
          ? "border-red-500/40 bg-red-500/10"
          : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold text-white">{title}</span>
        <span
          className={`flex size-5 items-center justify-center rounded-full border ${
            active
              ? "border-red-400 bg-red-500 text-white"
              : "border-white/15 text-transparent"
          }`}
        >
          <Check className="size-3" />
        </span>
      </span>
      <span className="mt-2 block text-xs leading-5 text-zinc-500">{description}</span>
    </button>
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <span className="text-xs text-zinc-600">{label}</span>
      <span className={`text-right text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

type UpdateDraft = <K extends keyof MessageDraft>(
  key: K,
  value: MessageDraft[K],
) => void;

function defaultSource(position: number): WhatsAppVariableSource {
  return (
    [
      "participant.first_name",
      "event.name",
      "event.date_long",
      "event.time",
      "event.full_location",
    ] as WhatsAppVariableSource[]
  )[position - 1] ?? "fixed.text";
}
