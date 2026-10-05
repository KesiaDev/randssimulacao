import { describe, expect, it } from "vitest";
import { calculateLance, rate } from "./lance-calc";

/**
 * Fonte de verdade: planilha "Proposta Marlon simulação lance.xlsx",
 * abas "Mascarello" (Grupo 1075) e "Cortina" (Grupo 940) — exceto o saldo
 * devedor e tudo que depende dele (parcela pós-contemplação, custo
 * efetivo), que foram recalculados conforme correção do Mauricio
 * (05/10/2026): o saldo devedor desconta a parcela inicial inteira, não
 * só o seguro.
 */
describe("motor de cálculo de lance vs planilha", () => {
  it("Grupo 1075 (aba Mascarello)", () => {
    const r = calculateLance({
      credit: 400000,
      adminRate: 0.1,
      reserveFund: 0.005,
      initialTerm: 75,
      remainingTerm: 58,
      reducedInstallmentRate: 0.35,
      embeddedBidRate: 0.5,
      cashBidRate: 0.15,
    });

    expect(r.creditWithFees).toBeCloseTo(442000, 6);
    expect(r.installmentBeforeInsurance).toBeCloseTo(2062.6666666666665, 6);
    expect(r.insurance).toBeCloseTo(176.8, 6);
    expect(r.installment).toBeCloseTo(2239.4666666666667, 6);
    expect(r.bidTotalRate).toBeCloseTo(0.65, 10);
    expect(r.bidTotalAmount).toBeCloseTo(287300, 6);
    expect(r.embeddedBidAmount).toBeCloseTo(221000, 6);
    expect(r.cashBidAmount).toBeCloseTo(66300, 6);
    expect(r.availableCredit).toBeCloseTo(179000, 6);
    expect(r.remainingBalance).toBeCloseTo(152460.53333333333, 6);
    expect(r.postContemplationTermMonths).toBe(56);
    expect(r.postContemplationInstallment).toBeCloseTo(2722.5095238095237, 6);
    expect(r.newMoney).toBeCloseTo(110460.53333333333, 6);
    expect(r.effectiveMonthlyCostRate).toBeCloseTo(0.01203192255135422, 8);
  });

  it("Grupo 940 (aba Cortina)", () => {
    const r = calculateLance({
      credit: 220000,
      adminRate: 0.1,
      reserveFund: 0.005,
      initialTerm: 84,
      remainingTerm: 84,
      reducedInstallmentRate: 0.4,
      embeddedBidRate: 0.35,
      cashBidRate: 0.25,
    });

    expect(r.creditWithFees).toBeCloseTo(243100, 6);
    expect(r.installmentBeforeInsurance).toBeCloseTo(1157.6190476190477, 6);
    expect(r.insurance).toBeCloseTo(97.24, 6);
    expect(r.installment).toBeCloseTo(1254.8590476190477, 6);
    expect(r.bidTotalRate).toBeCloseTo(0.6, 10);
    expect(r.bidTotalAmount).toBeCloseTo(145860, 6);
    expect(r.embeddedBidAmount).toBeCloseTo(85085, 6);
    expect(r.cashBidAmount).toBeCloseTo(60775, 6);
    expect(r.availableCredit).toBeCloseTo(134915, 6);
    expect(r.remainingBalance).toBeCloseTo(95985.14095238096, 6);
    expect(r.postContemplationTermMonths).toBe(82);
    expect(r.postContemplationInstallment).toBeCloseTo(1170.55049941928, 6);
    expect(r.newMoney).toBeCloseTo(72885.140952380956, 6);
    expect(r.effectiveMonthlyCostRate).toBeCloseTo(0.006984321561935898, 8);
  });

  it("RATE reproduz a função financeira do Excel", () => {
    expect(rate(56, -2722.5095238095237, 110460.53333333333)).toBeCloseTo(0.01203192255135422, 8);
    expect(rate(82, -1170.55049941928, 72885.140952380956)).toBeCloseTo(0.006984321561935898, 8);
  });
});
