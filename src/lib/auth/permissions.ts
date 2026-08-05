export const GLOBAL_PERMISSION_KEYS = [
  "create_events",
  "manage_team",
] as const;

export type GlobalPermission =
  (typeof GLOBAL_PERMISSION_KEYS)[number];

export const EVENT_PERMISSION_KEYS = [
  "edit_event",
  "checkin",
  "view_registrations",
  "manage_registrations",
  "anonymize_registrations",
  "view_reports",
  "view_logs",
] as const;

export type EventPermission =
  (typeof EVENT_PERMISSION_KEYS)[number];

export type EventPermissionSet = {
  canEditEvent: boolean;
  canCheckin: boolean;
  canViewRegistrations: boolean;
  canManageRegistrations: boolean;
  canAnonymizeRegistrations: boolean;
  canViewReports: boolean;
  canViewLogs: boolean;
};

export const EMPTY_EVENT_PERMISSIONS: EventPermissionSet = {
  canEditEvent: false,
  canCheckin: false,
  canViewRegistrations: false,
  canManageRegistrations: false,
  canAnonymizeRegistrations: false,
  canViewReports: false,
  canViewLogs: false,
};

export const EVENT_PERMISSION_LABELS: Array<{
  key: keyof EventPermissionSet;
  label: string;
  description: string;
  sensitive?: boolean;
}> = [
  {
    key: "canEditEvent",
    label: "Editar evento",
    description:
      "Altera datas, local, capacidade, inscrições e comunicação.",
  },
  {
    key: "canCheckin",
    label: "Realizar check-in",
    description:
      "Lê QR Code, pesquisa ingressos e confirma entradas.",
  },
  {
    key: "canViewRegistrations",
    label: "Ver inscritos",
    description:
      "Acessa dados e detalhes dos participantes.",
  },
  {
    key: "canManageRegistrations",
    label: "Gerenciar inscritos",
    description:
      "Reenvia ingresso, cancela inscrição e desfaz check-in.",
  },
  {
    key: "canAnonymizeRegistrations",
    label: "Anonimizar dados",
    description:
      "Remove permanentemente os dados pessoais do inscrito.",
    sensitive: true,
  },
  {
    key: "canViewReports",
    label: "Relatórios e exportação",
    description:
      "Visualiza indicadores e exporta participantes em CSV.",
  },
  {
    key: "canViewLogs",
    label: "Histórico",
    description:
      "Visualiza ações administrativas e auditoria.",
  },
];

export type AccessPreset =
  | "credentialing"
  | "service"
  | "analyst"
  | "event_manager"
  | "custom";

export const ACCESS_PRESETS: Record<
  Exclude<AccessPreset, "custom">,
  EventPermissionSet
> = {
  credentialing: {
    ...EMPTY_EVENT_PERMISSIONS,
    canCheckin: true,
  },
  service: {
    ...EMPTY_EVENT_PERMISSIONS,
    canViewRegistrations: true,
    canManageRegistrations: true,
  },
  analyst: {
    ...EMPTY_EVENT_PERMISSIONS,
    canViewReports: true,
    canViewLogs: true,
  },
  event_manager: {
    ...EMPTY_EVENT_PERMISSIONS,
    canEditEvent: true,
    canCheckin: true,
    canViewRegistrations: true,
    canManageRegistrations: true,
    canViewReports: true,
    canViewLogs: true,
  },
};

export function hasAnyEventPermission(
  permissions: EventPermissionSet,
) {
  return Object.values(permissions).some(Boolean);
}
