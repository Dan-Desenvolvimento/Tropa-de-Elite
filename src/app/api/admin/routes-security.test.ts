import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentStaff: vi.fn(),
  hasEventPermission: vi.fn(),
  hasGlobalPermission: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({
  getCurrentStaff: mocks.getCurrentStaff,
  hasEventPermission:
    mocks.hasEventPermission,
  hasGlobalPermission:
    mocks.hasGlobalPermission,
}));

import { POST as confirmCheckin } from "./events/[id]/checkin/confirm/route";
import { GET as exportRegistrations } from "./events/[id]/export/route";
import { POST as promoteWaitlist } from "./events/[id]/waitlist/promote/route";

describe("proteção das rotas administrativas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentStaff.mockResolvedValue(null);
  });

  it("bloqueia confirmação de check-in sem autenticação", async () => {
    const response = await confirmCheckin(
      new Request(
        "https://eventos.example.com/api/admin/events/event-1/checkin/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            value: "TDE-ABC123",
            method: "manual",
          }),
        },
      ),
      {
        params: Promise.resolve({
          id: "event-1",
        }),
      },
    );

    expect(response.status).toBe(401);
    expect(
      mocks.hasEventPermission,
    ).not.toHaveBeenCalled();
  });

  it("bloqueia exportação sem autenticação", async () => {
    const response = await exportRegistrations(
      new Request(
        "https://eventos.example.com/api/admin/events/event-1/export",
      ),
      {
        params: Promise.resolve({
          id: "event-1",
        }),
      },
    );

    expect(response.status).toBe(401);
    expect(
      mocks.hasEventPermission,
    ).not.toHaveBeenCalled();
  });

  it("bloqueia promoção da lista de espera sem autenticação", async () => {
    const response = await promoteWaitlist(
      new Request(
        "https://eventos.example.com/api/admin/events/event-1/waitlist/promote",
        { method: "POST" },
      ),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.hasEventPermission).not.toHaveBeenCalled();
  });
});
