import { createHmac, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

type WhatsAppStatus = {
  id?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
  errors?: Array<{ title?: string; message?: string; error_data?: { details?: string } }>;
};

type WhatsAppWebhook = {
  entry?: Array<{
    changes?: Array<{
      value?: { statuses?: WhatsAppStatus[] };
    }>;
  }>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verificação inválida.", { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return new Response("Webhook não configurado.", { status: 503 });

  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return new Response("Assinatura inválida.", { status: 401 });
  }

  let payload: WhatsAppWebhook;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhook;
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }

  const statuses = payload.entry
    ?.flatMap((entry) => entry.changes ?? [])
    .flatMap((change) => change.value?.statuses ?? []) ?? [];
  const supabase = createAdminClient();

  for (const item of statuses) {
    if (!item.id || !item.status) continue;
    const occurredAt = item.timestamp
      ? new Date(Number(item.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    if (item.status === "sent") {
      await supabase
        .from("whatsapp_logs")
        .update({ status: "sent", sent_at: occurredAt })
        .eq("provider_message_id", item.id)
        .eq("status", "pending");
    } else if (item.status === "delivered") {
      await supabase
        .from("whatsapp_logs")
        .update({ status: "delivered", delivered_at: occurredAt })
        .eq("provider_message_id", item.id)
        .in("status", ["pending", "sent", "delivered"]);
    } else if (item.status === "read") {
      await supabase
        .from("whatsapp_logs")
        .update({ status: "read", read_at: occurredAt })
        .eq("provider_message_id", item.id)
        .neq("status", "failed");
    } else if (item.status === "failed") {
      const providerError = item.errors?.[0];
      const errorMessage = providerError?.error_data?.details ?? providerError?.message ?? providerError?.title ?? "Falha informada pelo WhatsApp";
      await supabase
        .from("whatsapp_logs")
        .update({ status: "failed", error_message: errorMessage.slice(0, 1000) })
        .eq("provider_message_id", item.id)
        .in("status", ["pending", "sent"]);
    }
  }

  return Response.json({ received: true });
}

function isValidSignature(body: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(body).digest("hex");
  const received = signature.slice(7);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}
