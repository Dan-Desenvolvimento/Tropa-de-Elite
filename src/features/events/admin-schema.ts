import { z } from "zod";

import { isSafeHttpsUrl } from "@/lib/urls";

const optionalHttpsUrl = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || isSafeHttpsUrl(value),
    "Use uma URL HTTPS válida.",
  );

export const eventCustomFieldSchema = z
  .object({
    id: z.string().trim().regex(/^[a-zA-Z0-9_-]{3,80}$/, "Identificador de campo inválido."),
    label: z.string().trim().min(2, "Informe o nome do campo.").max(120),
    type: z.enum(["text", "select", "checkbox"]),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  })
  .superRefine((field, context) => {
    if (field.type === "select" && field.options.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Campos de seleção precisam de pelo menos duas opções.",
      });
    }
  });

export const adminEventSchema = z
  .object({
    name: z.string().trim().min(3).max(140),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
    description: z.string().trim().max(5000).default(""),
    coverImageUrl: optionalHttpsUrl,
    logoImageUrl: optionalHttpsUrl,
    startAt: z.string().datetime(),
    endAt: z.string().datetime().nullable(),
    timezone: z.string().trim().min(3).max(80).default("America/Bahia"),
    venueName: z.string().trim().min(2).max(180),
    address: z.string().trim().min(3).max(300),
    city: z.string().trim().min(2).max(120),
    capacity: z.number().int().positive().nullable(),
    waitlistEnabled: z.boolean(),
    showRemainingSlots: z.boolean(),
    whatsappGroupUrl: optionalHttpsUrl,
    registrationStatus: z.enum(["draft", "open", "closed", "sold_out", "finished", "cancelled"]),
    registrationOpenAt: z.string().datetime().nullable(),
    registrationCloseAt: z.string().datetime().nullable(),
    emailSubject: z.string().trim().max(180).nullable(),
    confirmationMessage: z.string().trim().max(1000).nullable(),
    supportEmail: z.string().trim().email().nullable(),
    privacyPolicyUrl: optionalHttpsUrl,
    requireCheckinConfirmation: z.boolean(),
    customFields: z.array(eventCustomFieldSchema).max(20).default([]),
  })
  .refine((data) => !data.endAt || new Date(data.endAt) > new Date(data.startAt), {
    path: ["endAt"],
    message: "O encerramento deve ocorrer depois do início.",
  })
  .refine(
    (data) =>
      !data.registrationOpenAt ||
      !data.registrationCloseAt ||
      new Date(data.registrationCloseAt) > new Date(data.registrationOpenAt),
    { path: ["registrationCloseAt"], message: "O fechamento deve ocorrer depois da abertura." },
  )
  .refine((data) => data.registrationStatus !== "open" || data.privacyPolicyUrl !== null, {
    path: ["privacyPolicyUrl"],
    message: "Informe uma Política de Privacidade antes de abrir as inscrições.",
  });

export type AdminEventInput = z.infer<typeof adminEventSchema>;
