import { z } from "zod";

export const WHATSAPP_VARIABLE_OPTIONS = [
  { value: "participant.first_name", label: "Primeiro nome do participante", sample: "João" },
  { value: "participant.full_name", label: "Nome completo do participante", sample: "João Miguel" },
  { value: "participant.ticket_code", label: "Código do ingresso", sample: "TDE-ABC123" },
  { value: "participant.ticket_path", label: "Complemento do link do ingresso", sample: "/abc123exemplo" },
  { value: "event.name", label: "Nome do evento", sample: "Tropa de Elite" },
  { value: "event.date_long", label: "Data por extenso", sample: "16 de agosto de 2026" },
  { value: "event.date_short", label: "Data resumida", sample: "16/08/2026" },
  { value: "event.time", label: "Horário", sample: "08:00" },
  { value: "event.venue", label: "Nome do local", sample: "FZ Espaço de Eventos" },
  { value: "event.address", label: "Endereço", sample: "Rua do Evento, 100" },
  { value: "event.city", label: "Cidade", sample: "Vitória da Conquista, BA" },
  { value: "event.full_location", label: "Local e endereço completos", sample: "FZ Espaço de Eventos — Rua do Evento, 100, Vitória da Conquista, BA" },
  { value: "event.maps_query", label: "Local para link dinâmico do mapa", sample: "FZ%20Espaço%20de%20Eventos%2C%20Vitória%20da%20Conquista" },
  { value: "event.whatsapp_group_url", label: "Link do grupo do evento", sample: "https://chat.whatsapp.com/exemplo" },
  { value: "event.whatsapp_group_path", label: "Código do link do grupo", sample: "exemplo" },
  { value: "fixed.text", label: "Texto fixo definido por você", sample: "Informação adicional" },
] as const;

export const WHATSAPP_BUTTON_VARIABLE_OPTIONS = WHATSAPP_VARIABLE_OPTIONS.filter(
  (option) =>
    [
      "participant.ticket_path",
      "event.maps_query",
      "event.whatsapp_group_path",
      "fixed.text",
    ].includes(option.value),
);

export type WhatsAppVariableSource = (typeof WHATSAPP_VARIABLE_OPTIONS)[number]["value"];

const sourceValues = WHATSAPP_VARIABLE_OPTIONS.map((option) => option.value) as [
  WhatsAppVariableSource,
  ...WhatsAppVariableSource[],
];

export const whatsappBodyVariableSchema = z
  .object({
    position: z.number().int().min(1).max(20),
    source: z.enum(sourceValues),
    value: z.string().trim().max(500).optional(),
  })
  .superRefine((variable, context) => {
    if (variable.source === "fixed.text" && !variable.value) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Informe o texto fixo desta variável.",
      });
    }
  });

export const whatsappButtonConfigSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({
    mode: z.literal("static"),
    label: z.string().trim().min(1).max(40),
  }),
  z.object({
    mode: z.literal("dynamic"),
    index: z.number().int().min(0).max(2),
    label: z.string().trim().min(1).max(40),
    baseUrl: z.string().trim().min(1, "Informe a URL-base aprovada na Meta.").max(2000),
    source: z.enum(sourceValues),
    value: z.string().trim().max(500).optional(),
    transform: z.enum(["none", "leading_slash"]).default("none"),
  }).superRefine((button, context) => {
    if (!isSafeHttpsUrl(button.baseUrl)) {
      context.addIssue({
        code: "custom",
        path: ["baseUrl"],
        message: "Use a mesma URL HTTPS cadastrada no botão do modelo da Meta.",
      });
    }
    if (button.source === "fixed.text" && !button.value) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Informe o complemento fixo do botão.",
      });
    }
  }),
]);

export const whatsappMessageConfigSchema = z
  .object({
    displayName: z.string().trim().min(3, "Dê um nome simples para esta comunicação.").max(80),
    description: z.string().trim().max(240).nullable().default(null),
    templateName: z.string().trim().regex(/^[a-z0-9_]{1,512}$/, "Use exatamente o nome técnico aprovado na Meta."),
    templateLanguage: z.string().trim().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/, "Use um idioma como pt_BR."),
    previewBody: z.string().trim().min(1, "Cole o corpo do modelo para gerar a prévia.").max(4096),
    headerKind: z.enum(["none", "image", "video"]),
    headerMediaUrl: z.string().trim().nullable().default(null),
    bodyVariables: z.array(whatsappBodyVariableSchema).max(20),
    buttonConfig: whatsappButtonConfigSchema,
    active: z.boolean().default(true),
  })
  .superRefine((message, context) => {
    if (message.headerKind !== "none" && !isSafeMediaUrl(message.headerMediaUrl)) {
      context.addIssue({
        code: "custom",
        path: ["headerMediaUrl"],
        message: "Envie a mídia do cabeçalho ou informe uma URL HTTPS válida.",
      });
    }

    const rawPlaceholders = [
      ...message.previewBody.matchAll(/\{\{([^{}]*)\}\}/g),
    ];
    const hasInvalidPlaceholder = rawPlaceholders.some((match) => {
      if (!/^\d+$/.test(match[1])) return true;
      const position = Number(match[1]);
      return position < 1 || position > 20;
    });
    if (hasInvalidPlaceholder) {
      context.addIssue({
        code: "custom",
        path: ["previewBody"],
        message: "Use somente variáveis numeradas de {{1}} até {{20}}.",
      });
    }

    const placeholders = extractVariablePositions(message.previewBody);
    const configured = message.bodyVariables.map((variable) => variable.position).sort((a, b) => a - b);
    const contiguous = placeholders.every(
      (position, index) => position === index + 1,
    );
    if (
      !contiguous ||
      new Set(configured).size !== configured.length ||
      placeholders.join(",") !== configured.join(",")
    ) {
      context.addIssue({
        code: "custom",
        path: ["bodyVariables"],
        message: "Use variáveis contínuas desde {{1}} e configure todas elas sem repetir posições.",
      });
    }

    if (
      message.buttonConfig.mode === "dynamic" &&
      !isButtonCompatibleSource(message.buttonConfig.source)
    ) {
      context.addIssue({
        code: "custom",
        path: ["buttonConfig", "source"],
        message: "Escolha um link ou complemento de link para o botão.",
      });
    }
  });

export type WhatsAppBodyVariable = z.infer<typeof whatsappBodyVariableSchema>;
export type WhatsAppButtonConfig = z.infer<typeof whatsappButtonConfigSchema>;
export type WhatsAppMessageConfigInput = z.infer<typeof whatsappMessageConfigSchema>;

export type WhatsAppMessageConfigRow = {
  id: string;
  event_id: string;
  display_name: string;
  description: string | null;
  template_name: string;
  template_language: string;
  preview_body: string;
  header_kind: "none" | "image" | "video";
  header_media_url: string | null;
  body_variables: WhatsAppBodyVariable[];
  button_config: WhatsAppButtonConfig;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function extractVariablePositions(text: string) {
  return [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])))]
    .filter((position) => position >= 1 && position <= 20)
    .sort((left, right) => left - right);
}

export function variableOption(source: WhatsAppVariableSource) {
  return WHATSAPP_VARIABLE_OPTIONS.find((option) => option.value === source);
}

export function configuredButtonExample(button: WhatsAppButtonConfig) {
  if (button.mode !== "dynamic") return null;
  const option = variableOption(button.source);
  const rawValue = button.source === "fixed.text"
    ? button.value ?? ""
    : option?.sample ?? "";
  const complement = button.transform === "leading_slash"
    ? `/${rawValue.replace(/^\/+/, "")}`
    : rawValue;
  return `${button.baseUrl}${complement}`;
}

function isSafeMediaUrl(value: string | null) {
  if (!value) return false;
  if (/^\/[a-zA-Z0-9/_\-.]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isButtonCompatibleSource(source: WhatsAppVariableSource) {
  return [
    "participant.ticket_path",
    "event.maps_query",
    "event.whatsapp_group_path",
    "fixed.text",
  ].includes(source);
}
