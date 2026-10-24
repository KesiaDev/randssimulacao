import { describe, expect, it } from "vitest";
import { QUALIFICATIONS, qualificationValue } from "./proposal-qualification";
import { canEditProposal } from "./dealer-manager";

describe("qualificação comercial", () => {
  it("oferece exatamente seis situações independentes", () => {
    expect(QUALIFICATIONS.map((q) => q.value)).toEqual(["unqualified", "hot", "warm", "cold", "won", "lost"]);
  });
  it("sem escolha mantém a proposta sem qualificação", () => {
    expect(qualificationValue(undefined)).toBe("unqualified");
    expect(qualificationValue(null)).toBe("unqualified");
  });
  it.each(["hot", "warm", "cold", "won", "lost"])("preserva a escolha %s", (value) => {
    expect(qualificationValue(value)).toBe(value);
  });
  it("vendedor altera somente seus registros; gerente não ganha edição da equipe", () => {
    expect(canEditProposal("seller", "seller", false)).toBe(true);
    expect(canEditProposal("manager", "seller", false)).toBe(false);
    expect(canEditProposal("admin", "seller", true)).toBe(true);
  });
});