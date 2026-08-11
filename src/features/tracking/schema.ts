import { z } from "zod";

export const trackingSettingsSchema = z.object({
  metaPixelId: z
    .string()
    .trim()
    .max(80)
    .refine((value) => value === "" || /^[0-9]+$/.test(value), "Informe um Pixel ID válido."),
  metaApiEnabled: z.boolean(),
  metaApiAccessToken: z.string().trim().max(1000).optional(),
});

export const trackingEventSchema = z.object({
  eventName: z.enum(["page_view", "form_started", "cta_click", "registration_completed", "ticket_view"]),
  source: z.enum(["site", "form"]),
  path: z.string().trim().min(1).max(500),
  eventId: z.string().uuid().optional(),
  metaEventId: z.string().trim().min(1).max(200).optional(),
  registrationId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  attribution: z.object({
    sessionId: z.string().trim().min(1).max(160).optional(),
    landingPage: z.string().trim().max(500).optional(),
    referrer: z.string().trim().max(1000).optional(),
    utmSource: z.string().trim().max(200).optional(),
    utmMedium: z.string().trim().max(200).optional(),
    utmCampaign: z.string().trim().max(200).optional(),
    utmContent: z.string().trim().max(200).optional(),
    utmTerm: z.string().trim().max(200).optional(),
    fbclid: z.string().trim().max(500).optional(),
    fbp: z.string().trim().max(500).optional(),
    fbc: z.string().trim().max(500).optional(),
  }).optional(),
});

export const trackingAttributionSchema = trackingEventSchema.shape.attribution.unwrap();

export type TrackingEventInput = z.infer<typeof trackingEventSchema>;
