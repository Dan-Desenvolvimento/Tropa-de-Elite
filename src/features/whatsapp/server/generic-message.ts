import "server-only";

import type {
  WhatsAppBodyVariable,
  WhatsAppButtonConfig,
  WhatsAppMessageConfigRow,
  WhatsAppVariableSource,
} from "@/features/whatsapp/message-config";

export type WhatsAppEventData = {
  id: string;
  name: string;
  start_at: string;
  timezone: string;
  venue_name: string;
  address: string;
  city: string;
  whatsapp_group_url: string | null;
};

export type WhatsAppRegistrationData = {
  id: string;
  full_name: string;
  phone: string;
  ticket_code: string;
  ticket_token: string;
  status: "confirmed" | "waitlist" | "cancelled";
  communications_consent: boolean;
};

type ValueContext = {
  event: WhatsAppEventData;
  registration: WhatsAppRegistrationData;
};

export function createConfiguredMessageComponents({
  config,
  event,
  registration,
  appUrl,
}: {
  config: WhatsAppMessageConfigRow;
  event: WhatsAppEventData;
  registration: WhatsAppRegistrationData;
  appUrl: string;
}) {
  assertEligibleRegistration(registration);
  const components: Array<Record<string, unknown>> = [];

  if (config.header_kind !== "none" && config.header_media_url) {
    const mediaType = config.header_kind;
    components.push({
      type: "header",
      parameters: [
        {
          type: mediaType,
          [mediaType]: {
            link: absoluteMediaUrl(
              config.header_media_url,
              appUrl,
            ),
          },
        },
      ],
    });
  }

  const orderedVariables = [...config.body_variables].sort(
    (left, right) => left.position - right.position,
  );
  if (orderedVariables.length > 0) {
    components.push({
      type: "body",
      parameters: orderedVariables.map((variable) => ({
        type: "text",
        text: resolveConfiguredValue(variable, {
          event,
          registration,
        }),
      })),
    });
  }

  if (config.button_config.mode === "dynamic") {
    const rawValue = resolveSourceValue(
      config.button_config.source,
      config.button_config.value,
      { event, registration },
    );
    components.push({
      type: "button",
      sub_type: "url",
      index: String(config.button_config.index),
      parameters: [
        {
          type: "text",
          text:
            config.button_config.transform === "leading_slash"
              ? `/${rawValue.replace(/^\/+/, "")}`
              : rawValue,
        },
      ],
    });
  }

  return components;
}

export function renderConfiguredPreview({
  config,
  event,
  registration,
}: {
  config: WhatsAppMessageConfigRow;
  event: WhatsAppEventData;
  registration: WhatsAppRegistrationData;
}) {
  let body = config.preview_body;
  for (const variable of config.body_variables) {
    body = body.replaceAll(
      `{{${variable.position}}}`,
      resolveConfiguredValue(variable, { event, registration }),
    );
  }
  return body;
}

export function renderConfiguredButtonUrl({
  config,
  event,
  registration,
}: {
  config: WhatsAppMessageConfigRow;
  event: WhatsAppEventData;
  registration: WhatsAppRegistrationData;
}) {
  if (config.button_config.mode !== "dynamic") return null;
  const rawValue = resolveSourceValue(
    config.button_config.source,
    config.button_config.value,
    { event, registration },
  );
  const complement = config.button_config.transform === "leading_slash"
    ? `/${rawValue.replace(/^\/+/, "")}`
    : rawValue;
  return `${config.button_config.baseUrl}${complement}`;
}

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(digits)) return digits;
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  return null;
}

export function assertEligibleRegistration(
  registration: WhatsAppRegistrationData,
) {
  if (registration.status !== "confirmed") {
    throw new Error("O participante precisa estar confirmado para receber esta comunicação.");
  }
  if (!registration.communications_consent) {
    throw new Error("O participante não autorizou o recebimento de comunicações.");
  }
  if (!normalizeBrazilianPhone(registration.phone)) {
    throw new Error("O participante não possui um telefone válido para WhatsApp.");
  }
}

function resolveConfiguredValue(
  variable: WhatsAppBodyVariable,
  context: ValueContext,
) {
  return resolveSourceValue(
    variable.source,
    variable.value,
    context,
  );
}

function resolveSourceValue(
  source: WhatsAppVariableSource,
  fixedValue: string | undefined,
  { event, registration }: ValueContext,
) {
  const eventDate = new Date(event.start_at);
  const fullLocation = `${event.venue_name} — ${event.address}, ${event.city}`;
  const map: Record<WhatsAppVariableSource, string> = {
    "participant.first_name": firstName(registration.full_name),
    "participant.full_name": registration.full_name,
    "participant.ticket_code": registration.ticket_code,
    "participant.ticket_path": registration.ticket_token,
    "event.name": event.name,
    "event.date_long": new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeZone: event.timezone,
    }).format(eventDate),
    "event.date_short": new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeZone: event.timezone,
    }).format(eventDate),
    "event.time": new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: event.timezone,
    }).format(eventDate),
    "event.venue": event.venue_name,
    "event.address": event.address,
    "event.city": event.city,
    "event.full_location": fullLocation,
    "event.maps_query": encodeURIComponent(fullLocation),
    "event.whatsapp_group_url": event.whatsapp_group_url ?? "",
    "event.whatsapp_group_path": whatsappGroupPath(event.whatsapp_group_url),
    "fixed.text": fixedValue ?? "",
  };
  return map[source];
}

function whatsappGroupPath(value: string | null) {
  if (!value) return "";
  try {
    return new URL(value).pathname.replace(/^\/+/, "");
  } catch {
    return value.replace(/^\/+/, "");
  }
}

function absoluteMediaUrl(value: string, appUrl: string) {
  if (/^https:\/\//i.test(value)) return value;
  return `${appUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function buttonDescription(button: WhatsAppButtonConfig) {
  if (button.mode === "none") return "Sem botão";
  if (button.mode === "static") return button.label;
  return `${button.label} · link dinâmico`;
}
