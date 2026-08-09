export const JOB_ROLE_VALUES = [
  "owner",
  "partner",
  "ceo",
  "director",
  "manager",
  "supervisor",
  "salesperson",
  "other",
] as const;

export type JobRole = (typeof JOB_ROLE_VALUES)[number];

const POTENTIAL_BUSINESS_OWNER_ROLES = new Set<JobRole>([
  "owner",
  "partner",
  "ceo",
  "director",
]);

export function isPotentialBusinessOwner(
  jobRole: string | null | undefined,
) {
  return jobRole
    ? POTENTIAL_BUSINESS_OWNER_ROLES.has(jobRole as JobRole)
    : false;
}

export const JOB_ROLE_OPTIONS: ReadonlyArray<{
  value: JobRole;
  label: string;
}> = [
  { value: "owner", label: "Dono" },
  { value: "partner", label: "Sócio" },
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
  if (!role) return "Não informado";

  if (role === "other") {
    return otherRole?.trim() || "Outro";
  }

  return JOB_ROLE_LABELS[role as JobRole] ?? role;
}
