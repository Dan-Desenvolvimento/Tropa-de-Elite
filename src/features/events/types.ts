export type EventCustomField = {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox";
  required: boolean;
  options: string[];
};

export type PublicEvent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  logoImageUrl: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string;
  venueName: string;
  address: string;
  city: string;
  capacity: number | null;
  showRemainingSlots: boolean;
  remainingSlots: number | null;
  waitlistEnabled: boolean;
  whatsappGroupUrl: string | null;
  registrationStatus: "draft" | "open" | "closed" | "sold_out" | "finished" | "cancelled";
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  privacyPolicyUrl: string | null;
  privacyPolicyVersion: string;
  supportEmail: string | null;
  customFields: EventCustomField[];
};
