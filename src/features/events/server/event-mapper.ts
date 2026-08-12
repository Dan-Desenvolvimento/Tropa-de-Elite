import type { AdminEventInput } from "@/features/events/admin-schema";

export function toDatabaseValues(data: AdminEventInput) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    cover_image_url: data.coverImageUrl,
    logo_image_url: data.logoImageUrl,
    start_at: data.startAt,
    end_at: data.endAt,
    timezone: data.timezone,
    venue_name: data.venueName,
    address: data.address,
    city: data.city,
    capacity: data.capacity,
    waitlist_enabled: data.waitlistEnabled,
    show_remaining_slots: data.showRemainingSlots,
    whatsapp_group_url: data.whatsappGroupUrl,
    whatsapp_template_name: data.whatsappTemplateName,
    whatsapp_template_language: data.whatsappTemplateLanguage,
    whatsapp_reminder_message: data.whatsappReminderMessage,
    registration_status: data.registrationStatus,
    registration_open_at: data.registrationOpenAt,
    registration_close_at: data.registrationCloseAt,
    email_subject: data.emailSubject,
    confirmation_message: data.confirmationMessage,
    support_email: data.supportEmail,
    privacy_policy_url: data.privacyPolicyUrl,
    require_checkin_confirmation: data.requireCheckinConfirmation,
    custom_fields: data.customFields,
  };
}
