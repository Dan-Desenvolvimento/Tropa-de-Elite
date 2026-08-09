import { describe, expect, it } from "vitest";

import { isPotentialBusinessOwner } from "./strategic-profile";

describe("isPotentialBusinessOwner", () => {
  it.each(["owner", "partner", "ceo", "director"])(
    "sinaliza o cargo %s",
    (jobRole) => {
      expect(
        isPotentialBusinessOwner(jobRole),
      ).toBe(true);
    },
  );

  it.each([
    "manager",
    "supervisor",
    "salesperson",
    "other",
    null,
    undefined,
  ])("nao sinaliza o cargo %s", (jobRole) => {
    expect(
      isPotentialBusinessOwner(jobRole),
    ).toBe(false);
  });
});
