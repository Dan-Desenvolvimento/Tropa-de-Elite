import "server-only";

import type {
  WhatsAppMessageConfigInput,
  WhatsAppMessageConfigRow,
} from "@/features/whatsapp/message-config";

export function toMessageConfigDatabaseValues(
  input: WhatsAppMessageConfigInput,
) {
  return {
    display_name: input.displayName,
    description: input.description,
    template_name: input.templateName,
    template_language: input.templateLanguage,
    preview_body: input.previewBody,
    header_kind: input.headerKind,
    header_media_url:
      input.headerKind !== "none"
        ? input.headerMediaUrl
        : null,
    body_variables: input.bodyVariables,
    button_config: input.buttonConfig,
    active: input.active,
  };
}

export function toMessageConfigDto(row: WhatsAppMessageConfigRow) {
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description,
    templateName: row.template_name,
    templateLanguage: row.template_language,
    previewBody: row.preview_body,
    headerKind: row.header_kind,
    headerMediaUrl: row.header_media_url,
    bodyVariables: row.body_variables,
    buttonConfig: row.button_config,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type WhatsAppMessageConfigDto = ReturnType<
  typeof toMessageConfigDto
>;
