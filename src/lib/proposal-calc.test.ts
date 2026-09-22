import { describe, expect, it } from "vitest";
import { calculate } from "./calc";
import { calculateProposalTotals } from "./proposal-calc";

const first = calculate({
  credit: 100000,
  adminRate: 0.1,
  reserveFund: 0.01,
  initialTerm: 100,
  multiplier: 1,
  insuranceRate: 0.0004,
  insuranceIncluded: true,
});
const second = calculate({
  credit: 200000,
  adminRate: 0.14,
  reserveFund: 0.01,
  initialTerm: 120,
  multiplier: 0.4,
  insuranceIncluded: false,
});

describe("composição de propostas", () => {
  it("mantém exatamente o valor individual quando a quantidade é um", () => {
    const total = calculateProposalTotals([{ quantity: 1, credit: 100000, result: first }]);
    expect(total.credit).toBe(100000);
    expect(total.finalAmount).toBe(first.finalAmount);
  });

  it("multiplica a configuração individual sem recalcular a fórmula", () => {
    const total = calculateProposalTotals([{ quantity: 5, credit: 100000, result: first }]);
    expect(total.quantity).toBe(5);
    expect(total.credit).toBe(500000);
    expect(total.installment).toBe(first.installment * 5);
    expect(total.insurance).toBe(first.insurance * 5);
    expect(total.finalAmount).toBe(first.finalAmount * 5);
  });

  it("consolida itens independentes de grupos diferentes", () => {
    const total = calculateProposalTotals([
      { quantity: 5, credit: 100000, result: first },
      { quantity: 3, credit: 200000, result: second },
    ]);
    expect(total.quantity).toBe(8);
    expect(total.credit).toBe(1100000);
    expect(total.finalAmount).toBe(first.finalAmount * 5 + second.finalAmount * 3);
  });
});
