export function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function safeHttpsUrl(value: string | null | undefined) {
  return value && isSafeHttpsUrl(value) ? value : null;
}
