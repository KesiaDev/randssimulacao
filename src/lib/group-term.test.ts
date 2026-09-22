import { describe, expect, it } from "vitest";
import { effectiveRemainingTerm } from "./group-term";

describe("effectiveRemainingTerm", () => {
  it("mantém o prazo antes de completar o primeiro mês", () => {
    expect(effectiveRemainingTerm(41, "2026-09-22", new Date("2026-10-21T12:00:00"))).toBe(41);
  });

  it("reduz uma parcela a cada mês completo", () => {
    expect(effectiveRemainingTerm(41, "2026-09-22", new Date("2026-10-22T12:00:00"))).toBe(40);
    expect(effectiveRemainingTerm(41, "2026-09-22", new Date("2027-01-22T12:00:00"))).toBe(37);
  });

  it("nunca retorna prazo negativo", () => {
    expect(effectiveRemainingTerm(2, "2026-09-22", new Date("2027-09-22T12:00:00"))).toBe(0);
  });
});