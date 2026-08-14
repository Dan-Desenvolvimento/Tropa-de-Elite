import { describe, expect, it } from "vitest";

import { toSafeDispatchError } from "@/features/whatsapp/dispatch-error";

describe("toSafeDispatchError", () => {
  it("identifica coluna ausente retornada pelo PostgREST", () => {
    const result = toSafeDispatchError({
      code: "PGRST204",
      message:
        "Could not find the 'target_registration_ids' column of 'whatsapp_dispatches' in the schema cache",
      details: null,
      hint: null,
    });

    expect(result.status).toBe(503);
    expect(result.publicMessage).toContain("migration 0026");
    expect(result.technical.code).toBe("PGRST204");
  });

  it("identifica coluna ausente retornada diretamente pelo PostgreSQL", () => {
    const result = toSafeDispatchError({
      code: "42703",
      message: 'column "lease_expires_at" does not exist',
    });

    expect(result.status).toBe(503);
    expect(result.publicMessage).toContain("desatualizado");
  });

  it("preserva mensagens de validação do domínio", () => {
    const result = toSafeDispatchError(
      new Error("Ative esta comunicação antes de enviar."),
    );

    expect(result).toMatchObject({
      status: 409,
      publicMessage: "Ative esta comunicação antes de enviar.",
    });
  });

  it("não expõe objetos inesperados ao cliente", () => {
    const result = toSafeDispatchError({
      code: "XX000",
      message: "internal database detail",
      details: "sensitive implementation detail",
    });

    expect(result.status).toBe(500);
    expect(result.publicMessage).not.toContain("internal database detail");
    expect(result.technical.message).toBe("internal database detail");
  });
});
