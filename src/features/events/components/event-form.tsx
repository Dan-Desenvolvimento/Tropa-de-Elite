"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { EventCustomField } from "@/features/events/types";
import { WhatsAppReminderButton } from "@/features/admin/components/whatsapp-reminder-button";

type EventFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  logoImageUrl?: string | null;
  startAt?: string;
  endAt?: string | null;
  timezone?: string;
  venueName?: string;
  address?: string;
  city?: string;
  capacity?: number | null;
  waitlistEnabled?: boolean;
  showRemainingSlots?: boolean;
  whatsappGroupUrl?: string | null;
  whatsappTemplateName?: string | null;
  whatsappTemplateLanguage?: string | null;
  registrationStatus?: string;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  emailSubject?: string | null;
  confirmationMessage?: string | null;
  supportEmail?: string | null;
  privacyPolicyUrl?: string | null;
  requireCheckinConfirmation?: boolean;
  customFields?: EventCustomField[];
};

export function EventForm({
  initial = {},
  whatsappApiConfigured = false,
  canSendWhatsApp = false,
}: {
  initial?: EventFormValues;
  whatsappApiConfigured?: boolean;
  canSendWhatsApp?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<EventCustomField[]>(initial.customFields ?? []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const nullableDate = (name: string) => {
      const value = String(data.get(name) ?? "").trim();
      return value ? new Date(value).toISOString() : null;
    };
    const nullableText = (name: string) => String(data.get(name) ?? "").trim() || null;
    const capacityValue = String(data.get("capacity") ?? "").trim();

    const body = {
      name: String(data.get("name") ?? ""),
      slug: String(data.get("slug") ?? ""),
      description: String(data.get("description") ?? ""),
      coverImageUrl: nullableText("coverImageUrl"),
      logoImageUrl: nullableText("logoImageUrl"),
      startAt: new Date(String(data.get("startAt"))).toISOString(),
      endAt: nullableDate("endAt"),
      timezone: String(data.get("timezone") ?? "America/Bahia"),
      venueName: String(data.get("venueName") ?? ""),
      address: String(data.get("address") ?? ""),
      city: String(data.get("city") ?? ""),
      capacity: capacityValue ? Number(capacityValue) : null,
      waitlistEnabled: data.get("waitlistEnabled") === "on",
      showRemainingSlots: data.get("showRemainingSlots") === "active",
      whatsappGroupUrl: nullableText("whatsappGroupUrl"),
      whatsappTemplateName: nullableText("whatsappTemplateName"),
      whatsappTemplateLanguage: String(data.get("whatsappTemplateLanguage") ?? "pt_BR"),
      registrationStatus: String(data.get("registrationStatus") ?? "draft"),
      registrationOpenAt: nullableDate("registrationOpenAt"),
      registrationCloseAt: nullableDate("registrationCloseAt"),
      emailSubject: nullableText("emailSubject"),
      confirmationMessage: nullableText("confirmationMessage"),
      supportEmail: nullableText("supportEmail"),
      privacyPolicyUrl: nullableText("privacyPolicyUrl"),
      requireCheckinConfirmation: data.get("requireCheckinConfirmation") === "on",
      customFields,
    };

    try {
      const response = await fetch(initial.id ? `/api/admin/events/${initial.id}` : "/api/admin/events", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as
        | { success: true; data: { id: string } }
        | { success: false; message: string };
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/admin/eventos/${result.data.id}`);
      router.refresh();
    } catch {
      setError("Não foi possível salvar o evento.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-red-500/60";

  return (
    <form onSubmit={submit} className="space-y-8">
      <FormSection title="Identificação">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome do evento"><input name="name" required defaultValue={initial.name} className={inputClass} /></Field>
          <Field label="Slug da URL"><input name="slug" required defaultValue={initial.slug} className={inputClass} placeholder="tropa-de-elite" /></Field>
        </div>
        <Field label="Descrição"><textarea name="description" defaultValue={initial.description ?? ""} rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-red-500/60" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Imagem de capa (URL HTTPS)"><input name="coverImageUrl" type="url" defaultValue={initial.coverImageUrl ?? ""} className={inputClass} /></Field>
          <Field label="Logo do evento (URL HTTPS)"><input name="logoImageUrl" type="url" defaultValue={initial.logoImageUrl ?? ""} className={inputClass} /></Field>
        </div>
      </FormSection>

      <FormSection title="Data e local">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Início"><input name="startAt" type="datetime-local" required defaultValue={toLocalInput(initial.startAt)} className={inputClass} /></Field>
          <Field label="Encerramento"><input name="endAt" type="datetime-local" defaultValue={toLocalInput(initial.endAt)} className={inputClass} /></Field>
          <Field label="Fuso horário"><input name="timezone" defaultValue={initial.timezone ?? "America/Bahia"} className={inputClass} /></Field>
          <Field label="Local"><input name="venueName" required defaultValue={initial.venueName} className={inputClass} /></Field>
          <Field label="Endereço"><input name="address" required defaultValue={initial.address} className={inputClass} /></Field>
          <Field label="Cidade"><input name="city" required defaultValue={initial.city} className={inputClass} /></Field>
        </div>
      </FormSection>

      <FormSection title="Inscrições e capacidade">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Capacidade"><input name="capacity" type="number" min="1" defaultValue={initial.capacity ?? ""} className={inputClass} /></Field>
          <Field label="Status">
            <select name="registrationStatus" defaultValue={initial.registrationStatus ?? "draft"} className={inputClass}>
              <option value="draft">Rascunho</option><option value="open">Aberto</option><option value="closed">Fechado</option><option value="sold_out">Esgotado</option><option value="finished">Finalizado</option><option value="cancelled">Cancelado</option>
            </select>
          </Field>
          <Field label="Abertura"><input name="registrationOpenAt" type="datetime-local" defaultValue={toLocalInput(initial.registrationOpenAt)} className={inputClass} /></Field>
          <Field label="Fechamento"><input name="registrationCloseAt" type="datetime-local" defaultValue={toLocalInput(initial.registrationCloseAt)} className={inputClass} /></Field>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-zinc-400">
          <Check name="waitlistEnabled" defaultChecked={initial.waitlistEnabled}>Ativar lista de espera</Check>
          <Field label="Contador de vagas no formulário">
            <select name="showRemainingSlots" defaultValue={initial.showRemainingSlots ? "active" : "inactive"} className={inputClass}>
              <option value="active">Ativo — mostrar vagas e percentual</option>
              <option value="inactive">Desativado — ocultar contador</option>
            </select>
          </Field>
          <Check name="requireCheckinConfirmation" defaultChecked={initial.requireCheckinConfirmation ?? true}>Exigir confirmação no check-in</Check>
        </div>
      </FormSection>

      <FormSection title="Campos personalizados">
        <p className="text-sm leading-6 text-zinc-500">
          Adicione somente informações necessárias para a organização. As respostas serão armazenadas junto à inscrição.
        </p>
        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} inputClass={inputClass} />
      </FormSection>

      <FormSection title="Comunicação">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Link do grupo de WhatsApp"><input name="whatsappGroupUrl" type="url" defaultValue={initial.whatsappGroupUrl ?? ""} className={inputClass} /></Field>
          <Field label="Modelo aprovado no WhatsApp"><input name="whatsappTemplateName" defaultValue={initial.whatsappTemplateName ?? ""} placeholder="lembrete_evento_qr" className={inputClass} /></Field>
          <Field label="Idioma do modelo"><input name="whatsappTemplateLanguage" defaultValue={initial.whatsappTemplateLanguage ?? "pt_BR"} className={inputClass} /></Field>
          <Field label="E-mail de suporte"><input name="supportEmail" type="email" defaultValue={initial.supportEmail ?? ""} className={inputClass} /></Field>
          <Field label="Assunto do e-mail"><input name="emailSubject" defaultValue={initial.emailSubject ?? ""} className={inputClass} /></Field>
          <Field label="Política de Privacidade (URL)"><input name="privacyPolicyUrl" type="url" defaultValue={initial.privacyPolicyUrl ?? ""} className={inputClass} /></Field>
        </div>
        <Field label="Mensagem de confirmação"><textarea name="confirmationMessage" defaultValue={initial.confirmationMessage ?? ""} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-red-500/60" /></Field>
        <div className="rounded-xl border border-white/8 bg-black/20 p-4 text-xs leading-5 text-zinc-500">
          O texto é controlado pelo modelo aprovado na Meta. O sistema preenche automaticamente, nesta ordem: nome do participante, evento, data, horário, local e código do ingresso. O QR Code individual é enviado como imagem do cabeçalho.
        </div>
        {initial.id ? (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${whatsappApiConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <p className="font-semibold text-white">API do WhatsApp {whatsappApiConfigured ? "configurada" : "ainda não configurada"}</p>
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
                  {whatsappApiConfigured
                    ? "Salve o evento antes do disparo. O envio considera apenas inscritos confirmados que aceitaram receber comunicações."
                    : "Adicione WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN e WHATSAPP_API_VERSION na Vercel e faça um novo deploy."}
                </p>
              </div>
              {canSendWhatsApp ? (
                <WhatsAppReminderButton
                  eventId={initial.id}
                  disabled={!whatsappApiConfigured || !initial.whatsappTemplateName}
                  disabledReason={!whatsappApiConfigured ? "Configure a API na Vercel." : "Salve o nome do modelo aprovado antes do disparo."}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </FormSection>

      {error ? <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      <button disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:bg-zinc-800">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Salvando" : "Salvar evento"}
      </button>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6"><h2 className="text-lg font-semibold text-white">{title}</h2>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-zinc-400">{label}{children}</label>; }
function Check({ name, defaultChecked, children }: { name: string; defaultChecked?: boolean; children: React.ReactNode }) { return <label className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-red-600" />{children}</label>; }
function toLocalInput(value?: string | null) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }

function CustomFieldsEditor({
  fields,
  onChange,
  inputClass,
}: {
  fields: EventCustomField[];
  onChange: (fields: EventCustomField[]) => void;
  inputClass: string;
}) {
  function updateField(index: number, values: Partial<EventCustomField>) {
    onChange(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...values } : field));
  }

  function addField() {
    onChange([
      ...fields,
      {
        id: `field_${crypto.randomUUID().replaceAll("-", "")}`,
        label: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="grid gap-4 rounded-xl border border-white/8 bg-black/20 p-4 sm:grid-cols-2">
          <Field label="Nome do campo">
            <input
              value={field.label}
              onChange={(event) => updateField(index, { label: event.target.value })}
              className={inputClass}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Tipo">
            <select
              value={field.type}
              onChange={(event) => updateField(index, { type: event.target.value as EventCustomField["type"], options: event.target.value === "select" ? field.options : [] })}
              className={inputClass}
            >
              <option value="text">Texto</option>
              <option value="select">Seleção</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </Field>
          {field.type === "select" ? (
            <div className="sm:col-span-2">
              <Field label="Opções separadas por vírgula">
                <input
                  value={field.options.join(", ")}
                  onChange={(event) => updateField(index, { options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })}
                  className={inputClass}
                  placeholder="Opção A, Opção B"
                  required
                />
              </Field>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) => updateField(index, { required: event.target.checked })}
                className="size-4 accent-red-600"
              />
              Resposta obrigatória
            </label>
            <button type="button" onClick={() => onChange(fields.filter((_, fieldIndex) => fieldIndex !== index))} className="text-sm text-red-400 hover:text-red-300">
              Remover campo
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addField} disabled={fields.length >= 20} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40">
        Adicionar campo
      </button>
    </div>
  );
}
