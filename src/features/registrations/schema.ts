import { z } from "zod";

import type { EventCustomField } from "@/features/events/types";

const brazilianPhone = /^\d{10,11}$/;

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(120, "O nome informado é muito longo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido.")
    .max(254),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().regex(brazilianPhone, "Informe um WhatsApp válido com DDD.")),
  city: z
    .string()
    .trim()
    .min(2, "Informe sua cidade.")
    .max(100, "O nome da cidade é muito longo."),
  privacyConsent: z
    .boolean()
    .refine((accepted) => accepted, "Você precisa aceitar a Política de Privacidade."),
  communicationsConsent: z.boolean().default(false),
  customAnswers: z.record(z.string(), z.unknown()).default({}),
  website: z.string().max(0).optional().default(""),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type ValidatedRegistration = z.output<typeof registrationSchema>;

export function createRegistrationSchema(customFields: EventCustomField[]) {
  return registrationSchema.superRefine((data, context) => {
    for (const field of customFields) {
      const value = data.customAnswers[field.id];
      const path = ["customAnswers", field.id];

      if (field.type === "checkbox") {
        if (value !== undefined && typeof value !== "boolean") {
          context.addIssue({ code: "custom", path, message: "Resposta inválida." });
        } else if (field.required && value !== true) {
          context.addIssue({ code: "custom", path, message: "Este campo é obrigatório." });
        }
        continue;
      }

      if (value !== undefined && typeof value !== "string") {
        context.addIssue({ code: "custom", path, message: "Resposta inválida." });
        continue;
      }

      const text = typeof value === "string" ? value.trim() : "";
      if (field.required && text.length === 0) {
        context.addIssue({ code: "custom", path, message: "Este campo é obrigatório." });
      } else if (text.length > 500) {
        context.addIssue({ code: "custom", path, message: "A resposta é muito longa." });
      } else if (field.type === "select" && text && !field.options.includes(text)) {
        context.addIssue({ code: "custom", path, message: "Selecione uma opção válida." });
      }
    }
  });
}

export function pickCustomAnswers(
  customFields: EventCustomField[],
  answers: Record<string, unknown>,
) {
  return Object.fromEntries(
    customFields.map((field) => {
      const value = answers[field.id];
      return [field.id, typeof value === "string" ? value.trim() : value ?? false];
    }),
  );
}

export function formatBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
