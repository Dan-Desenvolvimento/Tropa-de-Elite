import { describe, expect, it } from "vitest";

import { createSnapshot } from "@/features/events/components/event-capacity-indicator";

describe("createSnapshot", () => {
  it("calcula vagas preenchidas e percentual", () => {
    expect(createSnapshot(100, 23)).toEqual({
      capacity: 100,
      confirmed: 77,
      remaining: 23,
      percentage: 77,
    });
  });

  it("limita valores fora da capacidade", () => {
    expect(createSnapshot(10, -4)).toEqual({
      capacity: 10,
      confirmed: 10,
      remaining: 0,
      percentage: 100,
    });
  });
});
