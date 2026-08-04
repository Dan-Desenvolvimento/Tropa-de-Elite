export function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isSafeWhatsAppUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;

    const hostname = url.hostname.toLowerCase();
    const hasValueAfterSlash = url.pathname.length > 1;

    return (
      hasValueAfterSlash &&
      (hostname === "chat.whatsapp.com" || hostname === "wa.me")
    );
  } catch {
    return false;
  }
}

export function safeHttpsUrl(value: string | null | undefined) {
  return value && isSafeHttpsUrl(value) ? value : null;
}
