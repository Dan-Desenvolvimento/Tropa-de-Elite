import type {
  WhatsAppBodyVariable,
  WhatsAppButtonConfig,
} from "@/features/whatsapp/message-config";

export type MessageConfig = {
  id: string;
  displayName: string;
  description: string | null;
  templateName: string;
  templateLanguage: string;
  previewBody: string;
  headerKind: "none" | "image";
  headerMediaUrl: string | null;
  bodyVariables: WhatsAppBodyVariable[];
  buttonConfig: WhatsAppButtonConfig;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MessageDraft = Omit<
  MessageConfig,
  "id" | "sortOrder" | "createdAt" | "updatedAt"
>;

export type AudienceBreakdown = {
  total: number;
  eligible: number;
  withoutConsent: number;
  notConfirmed: number;
  invalidPhone: number;
};

export type MessagePreview = {
  participant: {
    id: string;
    name: string;
    phone: string;
  };
  body: string;
  headerMediaUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  audience: AudienceBreakdown;
};

export type Dispatch = {
  id: string;
  messageConfigId?: string;
  scope: "bulk" | "test" | "individual";
  status:
    | "queued"
    | "processing"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled";
  eligibleCount: number;
  processedCount: number;
  sentCount: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount: number;
  skippedCount: number;
  invalidPhoneCount?: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
};

export type TestParticipant = {
  id: string;
  name: string;
  ticketCode: string;
};

export const EMPTY_MESSAGE_DRAFT: MessageDraft = {
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
};
