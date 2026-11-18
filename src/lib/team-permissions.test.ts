import { describe, expect, it } from "vitest";
import { assertUserAccessOwner, canManageUserAccess, canReactivateUser } from "./team-permissions";

const kesia = "d58f0c77-e079-4c01-aba5-b3dda75d8071";
const mauricio = "a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd";

describe("gestão de acesso exclusiva da Kesia", () => {
  it("permite Kesia ativa e administradora", () => {
    expect(canManageUserAccess(kesia, true, true)).toBe(true);
  });
  it("permite Maurício com as mesmas permissões da Kesia", () => {
    expect(canManageUserAccess(mauricio, true, true)).toBe(true);
  });
  it("nega outros administradores", () => {
    expect(canManageUserAccess("another-admin", true, true)).toBe(false);
  });
  it("Maurício pode reativar", () => {
    expect(canReactivateUser(mauricio, true, true)).toBe(true);
    expect(canReactivateUser(mauricio, false, true)).toBe(false);
    expect(canReactivateUser(mauricio, true, false)).toBe(false);
    expect(canReactivateUser("another-admin", true, true)).toBe(false);
  });
  it("exige papel protegido e conta ativa", () => {
    expect(canManageUserAccess(kesia, false, true)).toBe(false);
    expect(canManageUserAccess(kesia, true, false)).toBe(false);
  });
  it("o servidor rejeita Maurício usando identidade autenticada", async () => {
    const supabase = {
      rpc: async () => ({ data: true }),
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { active: true } }) }) }) }),
    };
    await expect(assertUserAccessOwner({ userId: mauricio, supabase })).resolves.toBeUndefined();
    await expect(assertUserAccessOwner({ userId: "another-admin", supabase })).rejects.toThrow("Somente Kesia");
    await expect(assertUserAccessOwner({ userId: mauricio, supabase }, true)).resolves.toBeUndefined();
    await expect(assertUserAccessOwner({ userId: kesia, supabase })).resolves.toBeUndefined();
  });
});