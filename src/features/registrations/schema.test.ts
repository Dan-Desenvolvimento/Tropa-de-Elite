import { describe, expect, it } from "vitest";

import {
  createRegistrationSchema,
  formatBrazilianPhone,
  pickCustomAnswers,
  registrationSchema,
} from "@/features/registrations/schema";

const customFields = [
  {
    id: "departamento",
    label: "Departamento",
    type: "select" as const,
    required: true,
    options: ["Comercial", "Marketing"],
  },
  {
    id: "termos_extras",
    label: "Aceite adicional",
    type: "checkbox" as const,
    required: true,
    options: [],
  },
];

const validRegistration = {
  fullName: "Maria da Silva",
  email: "MARIA@EXEMPLO.COM",
  phone: "(77) 99999-8888",
  city: "VitÃ³ria da Conquista",
  companyName: "Empresa Exemplo",
  jobRole: "director" as const,
  jobRoleOther: "",
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
    expect(result.companyName).toBe("Empresa Exemplo");
    expect(result.jobRole).toBe("director");
  });

  it("rejeita e-mail inválido", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      email: "invalido",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita telefone inválido", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      phone: "123",
    });
    expect(result.success).toBe(false);
  });

  it("exige o nome da empresa", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      companyName: "",
    });
    expect(result.success).toBe(false);
  });

  it("exige a descrição quando o cargo é Outros", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      jobRole: "other",
      jobRoleOther: "",
    });
    expect(result.success).toBe(false);
  });

  it("aceita uma função personalizada quando o cargo é Outros", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      jobRole: "other",
      jobRoleOther: "Consultora comercial",
    });
    expect(result.success).toBe(true);
  });

  it("exige consentimento de privacidade", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      privacyConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("valida campos personalizados obrigatórios e opções permitidas", () => {
    const schema = createRegistrationSchema(customFields);
    expect(
      schema.safeParse({ ...validRegistration, customAnswers: {} }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...validRegistration,
        customAnswers: {
          departamento: "Outro",
          termos_extras: true,
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...validRegistration,
        customAnswers: {
          departamento: "Comercial",
          termos_extras: true,
        },
      }).success,
    ).toBe(true);
  });

  it("remove respostas que não pertencem ao evento", () => {
    expect(
      pickCustomAnswers(customFields, {
        departamento: " Comercial ",
        termos_extras: true,
        admin: "injetado",
      }),
    ).toEqual({
      departamento: "Comercial",
      termos_extras: true,
    });
  });
});

describe("formatBrazilianPhone", () => {
  it("aplica máscara de celular", () => {
    expect(formatBrazilianPhone("77999998888")).toBe("(77) 99999-8888");
  });
});
