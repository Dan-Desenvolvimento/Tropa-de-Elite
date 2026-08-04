import { describe, expect, it } from "vitest";

import {
  createRegistrationSchema,
  formatBrazilianPhone,
  pickCustomAnswers,
  registrationSchema,
} from "@/features/registrations/schema";

const customFields = [
  { id: "cargo", label: "Cargo", type: "select" as const, required: true, options: ["Diretor", "Gerente"] },
  { id: "termos_extras", label: "Aceite adicional", type: "checkbox" as const, required: true, options: [] },
];

const validRegistration = {
  fullName: "Maria da Silva",
  email: "MARIA@EXEMPLO.COM",
  phone: "(77) 99999-8888",
  city: "Vitória da Conquista",
  privacyConsent: true,
  communicationsConsent: false,
  customAnswers: {},
  website: "",
};

describe("registrationSchema", () => {
  it("normaliza uma inscrição válida", () => {
    const result = registrationSchema.parse(validRegistration);
    expect(result.email).toBe("maria@exemplo.com");
    expect(result.phone).toBe("77999998888");
  });

  it("rejeita e-mail inválido", () => {
    const result = registrationSchema.safeParse({ ...validRegistration, email: "invalido" });
    expect(result.success).toBe(false);
  });

  it("rejeita telefone inválido", () => {
    const result = registrationSchema.safeParse({ ...validRegistration, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("exige consentimento de privacidade", () => {
    const result = registrationSchema.safeParse({ ...validRegistration, privacyConsent: false });
    expect(result.success).toBe(false);
  });

  it("valida campos personalizados obrigatórios e opções permitidas", () => {
    const schema = createRegistrationSchema(customFields);
    expect(schema.safeParse({ ...validRegistration, customAnswers: {} }).success).toBe(false);
    expect(schema.safeParse({ ...validRegistration, customAnswers: { cargo: "Outro", termos_extras: true } }).success).toBe(false);
    expect(schema.safeParse({ ...validRegistration, customAnswers: { cargo: "Gerente", termos_extras: true } }).success).toBe(true);
  });

  it("remove respostas que não pertencem ao evento", () => {
    expect(pickCustomAnswers(customFields, { cargo: " Diretor ", termos_extras: true, admin: "injetado" })).toEqual({
      cargo: "Diretor",
      termos_extras: true,
    });
  });
});

describe("formatBrazilianPhone", () => {
  it("aplica máscara de celular", () => {
    expect(formatBrazilianPhone("77999998888")).toBe("(77) 99999-8888");
  });
});
