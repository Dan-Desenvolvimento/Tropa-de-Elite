import "server-only";

import { createHmac } from "node:crypto";

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

export function hashRequestIdentifier(value: string) {
  const secret = process.env.CHECKIN_RATE_LIMIT_SECRET;
  if (!secret) throw new Error("CHECKIN_RATE_LIMIT_SECRET is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
