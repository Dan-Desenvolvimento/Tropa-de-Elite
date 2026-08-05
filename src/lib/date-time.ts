const DEFAULT_EVENT_TIME_ZONE = "America/Bahia";

export function formatDateTime(
  value: string | Date,
  timeZone = DEFAULT_EVENT_TIME_ZONE,
) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "â€”";
  }

  const createFormatter = (zone: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: zone,
    });

  try {
    return createFormatter(timeZone).format(date);
  } catch {
    return createFormatter(DEFAULT_EVENT_TIME_ZONE).format(date);
  }
}