export const JOB_ROLE_VALUES = [
  "owner",
  "ceo",
  "director",
  "manager",
  "supervisor",
  "salesperson",
  "other",
] as const;

export type JobRole = (typeof JOB_ROLE_VALUES)[number];

export const JOB_ROLE_OPTIONS: ReadonlyArray<{
  value: JobRole;
  label: string;
}> = [
  { value: "owner", label: "Dono" },
  { value: "ceo", label: "C.E.O" },
  { value: "director", label: "Diretor" },
  { value: "manager", label: "Gerente" },
  { value: "supervisor", label: "Supervisor" },
  { value: "salesperson", label: "Vendedor" },
  { value: "other", label: "Outros" },
];

const JOB_ROLE_LABELS: Record<JobRole, string> = Object.fromEntries(
  JOB_ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<JobRole, string>;

export function formatJobRole(
  role: string | null | undefined,
  otherRole?: string | null,
) {
  if (!role) return "NÃ£o informado";

  if (role === "other") {
    return otherRole?.trim() || "Outro";
  }

  return JOB_ROLE_LABELS[role as JobRole] ?? role;
}
