import { describe, expect, it } from "vitest";
import { changePercent, commercialInsight, type MonthlyResult } from "./commercial-insights";

const annual = { ano: 2026, revenda: "Compasi", meta: 2400, realizado: 99999 };
const first: MonthlyResult = { ano: 2026, revenda: "Compasi", mes: 1, valor: 100 };
const rows: MonthlyResult[] = [100, 200, 300].map((valor, i) => ({ ano: 2026, revenda: "Compasi", mes: i + 1, valor }));
describe("indicadores comerciais baseados em períodos comparáveis", () => {
  it("projeta apenas meses registrados, sem substituir o histórico anual", () => {
    const result = commercialInsight(annual, rows, 3);
    expect(result.projection).toBe(2400);
    expect(result.required).toBe(200);
    expect(result.cautious).toBe(2220);
    expect(result.growth).toBeCloseTo(2580);
    expect(annual.realizado).toBe(99999);
  });
  it("não trata mês ausente como zero nem publica projeção incompleta", () => {
    expect(commercialInsight(annual, rows.slice(1), 3).projection).toBeNull();
    expect(commercialInsight(annual, [{ ...first, valor: null }], 1).projection).toBeNull();
  });
  it("aceita zero explícito como resultado registrado", () => {
    expect(commercialInsight(annual, [{ ...first, valor: 0 }], 1).projection).toBe(0);
  });
  it("compara somente os mesmos meses nos dois anos", () => {
    const result = commercialInsight(annual, [...rows, { ano: 2025, revenda: "Compasi", mes: 2, valor: 100 }], 3);
    expect(result.yearChange).toBe(100);
    expect(result.pairedMonths).toBe(1);
    expect(result.monthChange).toBe(50);
  });
  it("não divide por zero nem inventa uma base anterior", () => {
    expect(changePercent(100, 0)).toBeNull();
    expect(changePercent(100, null)).toBeNull();
  });
  it("não inclui meses posteriores ao corte e não divide no fim do ano", () => {
    expect(commercialInsight(annual, [...rows, { ...first, mes: 4, valor: 10000 }], 3).projection).toBe(2400);
    const all = Array.from({ length: 12 }, (_, i) => ({ ...first, mes: i + 1, valor: 100 }));
    expect(commercialInsight(annual, all, 12).projection).toBe(1200);
    expect(commercialInsight(annual, all, 12).required).toBeNull();
  });
});