import "server-only";

import { Resend } from "resend";

import { StaffInvitationEmail } from "@/emails/staff-invitation";

type SendStaffInvitationInput = {
  userId: string;
  fullName: string;
  email: string;
  globalRole: "admin" | "checkin_operator";
  inviteUrl: string;
};

export async function sendStaffInvitation(input: SendStaffInvitationInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EVENT_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "NOT_CONFIGURED" } as const;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send(
    {
      from,
      to: input.email,
      replyTo: process.env.EVENT_REPLY_TO_EMAIL || undefined,
      subject: "Convite para equipe — Tropa de Elite",
      react: StaffInvitationEmail({
        firstName: input.fullName.trim().split(/\s+/)[0] ?? input.fullName,
        roleLabel: input.globalRole === "admin" ? "administrador" : "operador de check-in",
        inviteUrl: input.inviteUrl,
      }),
    },
    { idempotencyKey: `staff-invitation/${input.userId}` },
  );

  if (error) return { sent: false, reason: "PROVIDER_ERROR" } as const;
  return { sent: true, providerMessageId: data?.id ?? null } as const;
}

