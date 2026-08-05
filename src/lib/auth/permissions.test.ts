import { describe, expect, it } from "vitest";

import {
  ACCESS_PRESETS,
  EMPTY_EVENT_PERMISSIONS,
  hasAnyEventPermission,
} from "./permissions";

describe("permissões administrativas", () => {
  it("mantém o credenciamento restrito ao check-in", () => {
    expect(ACCESS_PRESETS.credentialing).toEqual({
      ...EMPTY_EVENT_PERMISSIONS,
      canCheckin: true,
    });
  });

  it("reconhece quando existe uma permissão de evento", () => {
    expect(
      hasAnyEventPermission({
        ...EMPTY_EVENT_PERMISSIONS,
        canViewReports: true,
      }),
    ).toBe(true);
    expect(
      hasAnyEventPermission(EMPTY_EVENT_PERMISSIONS),
    ).toBe(false);
  });

  it("não concede anonimização ao gestor por padrão", () => {
    expect(
      ACCESS_PRESETS.event_manager
        .canAnonymizeRegistrations,
    ).toBe(false);
  });
});
