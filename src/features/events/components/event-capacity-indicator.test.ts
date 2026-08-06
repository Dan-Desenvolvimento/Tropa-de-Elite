import { describe, expect, it } from "vitest";

import { createSnapshot } from "./event-capacity-indicator";

describe("createSnapshot", () => {
  it("calcula ocupação e percentual", () => {
    expect(createSnapshot(300, 257)).toEqual({
      capacity: 300,
      confirmed: 43,
      remaining: 257,
      percentage: 14,
    });
  });

  it("limita vagas restantes ao intervalo da capacidade", () => {
    expect(createSnapshot(100, 130)).toMatchObject({
      confirmed: 0,
      remaining: 100,
      percentage: 0,
    });
    expect(createSnapshot(100, -4)).toMatchObject({
      confirmed: 100,
      remaining: 0,
      percentage: 100,
    });
  });

  it("evita divisão inválida para capacidade zero", () => {
    expect(createSnapshot(0, 0)).toEqual({
      capacity: 1,
      confirmed: 1,
      remaining: 0,
      percentage: 100,
    });
  });
});
