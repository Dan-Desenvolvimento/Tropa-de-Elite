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
  eventName: z.enum(["page_view", "cta_click", "registration_completed", "ticket_view"]),
  source: z.enum(["site", "form"]),
  path: z.string().trim().min(1).max(500),
  eventId: z.string().uuid().optional(),
  registrationId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type TrackingEventInput = z.infer<typeof trackingEventSchema>;
