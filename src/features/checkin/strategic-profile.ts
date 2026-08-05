const POTENTIAL_BUSINESS_OWNER_ROLES = new Set([
  "owner",
  "ceo",
  "director",
]);

export function isPotentialBusinessOwner(
  jobRole: string | null | undefined,
) {
  return jobRole
    ? POTENTIAL_BUSINESS_OWNER_ROLES.has(jobRole)
    : false;
}
