"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { EventCustomField } from "@/features/events/types";
import {
  createRegistrationSchema,
  formatBrazilianPhone,
  type RegistrationInput,
  type ValidatedRegistration,
} from "@/features/registrations/schema";

type RegistrationFormProps = {
  eventSlug: string;
  privacyPolicyUrl: string | null;
  customFields?: EventCustomField[];
  disabled?: boolean;
};

type RegistrationResponse =
  | {
      success: true;
      data: { ticketToken: string; status: "confirmed" | "waitlist" };
    }
  | { success: false; code: string; message: string };

export function RegistrationForm({
  eventSlug,
  privacyPolicyUrl,
  customFields = [],
  disabled = false,
}: RegistrationFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput, unknown, ValidatedRegistration>({
    resolver: zodResolver(createRegistrationSchema(customFields)),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      city: "",
      privacyConsent: false,
      communicationsConsent: false,
      customAnswers: {},
      website: "",
    },
  });

  async function onSubmit(input: ValidatedRegistration) {
    setServerError(null);
    setServerErrorCode(null);

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventSlug)}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as RegistrationResponse;

      if (!result.success) {
        setServerError(result.message);
        setServerErrorCode(result.code);
        return;
      }

      const query = new URLSearchParams({
        ingresso: result.data.ticketToken,
        status: result.data.status,
      });
      router.push(`/eventos/${eventSlug}/confirmacao?${query.toString()}`);
    } catch {
      setServerError("Não foi possível concluir sua inscrição agora. Tente novamente.");
      setServerErrorCode("NETWORK_ERROR");
    }
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <Field label="Nome completo" error={errors.fullName?.message}>
        <input
          className={inputClass}
          autoComplete="name"
          placeholder="Como está no seu documento"
          {...register("fullName")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="E-mail" error={errors.email?.message}>
          <input
            type="email"
            className={inputClass}
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            {...register("email")}
          />
        </Field>
        <Field label="WhatsApp com DDD" error={errors.phone?.message}>
          <input
            className={inputClass}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(77) 99999-9999"
            {...register("phone", {
              onChange: (event) => setValue("phone", formatBrazilianPhone(event.target.value)),
            })}
          />
        </Field>
      </div>

      <Field label="Cidade" error={errors.city?.message}>
        <input
          className={inputClass}
          autoComplete="address-level2"
          placeholder="Sua cidade"
          {...register("city")}
        />
      </Field>

      {customFields.map((field) => {
        const fieldError = errors.customAnswers?.[field.id]?.message;
        return (
          <Field key={field.id} label={`${field.label}${field.required ? " *" : ""}`} error={typeof fieldError === "string" ? fieldError : undefined}>
            {field.type === "select" ? (
              <select className={inputClass} defaultValue="" {...register(`customAnswers.${field.id}`)}>
                <option value="" disabled>Selecione</option>
                {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.type === "checkbox" ? (
              <input type="checkbox" className="mt-3 size-5 accent-red-600" {...register(`customAnswers.${field.id}`)} />
            ) : (
              <input className={inputClass} maxLength={500} {...register(`customAnswers.${field.id}`)} />
            )}
          </Field>
        );
      })}

      <div className="space-y-3 rounded-xl border border-white/8 bg-black/25 p-4 text-sm text-zinc-400">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 accent-red-600" {...register("privacyConsent")} />
          <span>
            Li e aceito a{" "}
            {privacyPolicyUrl ? (
              <a
                href={privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 underline underline-offset-2"
              >
                Política de Privacidade
              </a>
            ) : (
              "Política de Privacidade"
            )}
            .
          </span>
        </label>
        {errors.privacyConsent?.message ? (
          <p className="text-xs text-red-400">{errors.privacyConsent.message}</p>
        ) : null}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-red-600"
            {...register("communicationsConsent")}
          />
          <span>Aceito receber comunicações relacionadas a este evento.</span>
        </label>
      </div>

      {serverError ? (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <p>{serverError}</p>
          {serverErrorCode === "DUPLICATE_REGISTRATION" ? (
            <a href={`/eventos/${encodeURIComponent(eventSlug)}/reenviar-ingresso`} className="mt-3 inline-flex font-semibold text-white underline underline-offset-4">
              Solicitar reenvio do ingresso
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="brand-glow flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-5 animate-spin" /> Processando inscrição
          </>
        ) : disabled ? (
          "Inscrições indisponíveis"
        ) : (
          <>
            Garantir minha vaga <ArrowRight className="size-5" />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
        <CheckCircle2 className="size-4 text-emerald-500" /> Seus dados são usados somente para a organização do evento.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-300">
      {label}
      {children}
      {error ? <span className="mt-1.5 block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
