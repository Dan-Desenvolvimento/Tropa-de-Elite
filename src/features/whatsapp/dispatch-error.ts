type ErrorRecord = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export type SafeDispatchError = {
  publicMessage: string;
  status: number;
  technical: {
    code: string | null;
    message: string;
    details: string | null;
    hint: string | null;
  };
};

const SCHEMA_ERROR_CODES = new Set([
  "42P01",
  "42703",
  "PGRST204",
  "PGRST205",
]);

/**
 * Converte erros de domínio e objetos PostgREST em uma resposta segura.
 * O cliente recebe uma orientação acionável, enquanto o log do servidor
 * preserva código e diagnóstico técnico sem incluir payload ou destinatário.
 */
export function toSafeDispatchError(error: unknown): SafeDispatchError {
  const record = isErrorRecord(error) ? error : null;
  const code = asNonEmptyString(record?.code);
  const rawMessage =
    error instanceof Error
      ? error.message
      : asNonEmptyString(record?.message) ?? "Erro desconhecido ao criar o disparo.";
  const details = asNonEmptyString(record?.details);
  const hint = asNonEmptyString(record?.hint);
  const looksLikeMissingSchema =
    Boolean(code && SCHEMA_ERROR_CODES.has(code)) ||
    /column .* does not exist|schema cache|could not find the .* column/i.test(
      rawMessage,
    );

  if (looksLikeMissingSchema) {
    return {
      publicMessage:
        "O banco da Central de Comunicação está desatualizado. Aplique a migration 0026 e tente novamente.",
      status: 503,
      technical: { code, message: rawMessage, details, hint },
    };
  }

  if (error instanceof Error) {
    return {
      publicMessage: rawMessage,
      status: 409,
      technical: { code, message: rawMessage, details, hint },
    };
  }

  return {
    publicMessage:
      "Não foi possível registrar o envio. Consulte os logs do servidor e tente novamente.",
    status: 500,
    technical: { code, message: rawMessage, details, hint },
  };
}

function isErrorRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
