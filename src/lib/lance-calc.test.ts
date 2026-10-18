import { describe, expect, it } from "vitest";
import { calculateLance, rate } from "./lance-calc";

/**
 * Regressões de parâmetros anteriores, com saldo corrigido pela fórmula
 * Propostas_Simulação.xlsx, Padrão/Planilha2!S3:S4 (desconta K, sem seguro).
 * Mascarello/Cortina possuem outra fórmula de saldo e não definem as modalidades.
 */
describe("motor de cálculo de lance vs planilha", () => {
  it("Grupo 1075: parâmetros anteriores, saldo conforme Padrão!S4", () => {
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
    expect(r.remainingBalance).toBeCloseTo(152637.33333333334, 6);
    expect(r.postContemplationTermMonths).toBe(56);
    expect(r.postContemplationInstallment).toBeCloseTo(2725.666666666667, 6);
    expect(r.newMoney).toBeCloseTo(110460.53333333333, 6);
    expect(r.effectiveMonthlyCostRate).toBeCloseTo(0.01207811470190351, 8);
  });

  it("Grupo 940: parâmetros anteriores, saldo conforme Planilha2!S4", () => {
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
    expect(r.remainingBalance).toBeCloseTo(96082.38095238096, 6);
    expect(r.postContemplationTermMonths).toBe(82);
    expect(r.postContemplationInstallment).toBeCloseTo(1171.7363530778166, 6);
    expect(r.newMoney).toBeCloseTo(72885.140952380956, 6);
    expect(r.effectiveMonthlyCostRate).toBeCloseTo(0.007011429562540154, 8);
  });

  it("Grupo 1061 sem seguro (insuranceRate 0 não pode cair no padrão 0,04%)", () => {
    // Regressão: caller passava `Number(item.insurance_rate) || 0.0004`, e
    // como 0 é falsy em JS, todo grupo "sem seguro" caía no padrão de
    // 0,04% só dentro do cálculo do lance (a parcela normal da proposta
    // ficava certa, só a simulação de lance inflava o saldo devedor).
    // Caso real reportado pelo Mauricio (12/10/2026): parcela pós deu
    // R$728,37 em vez de R$729,24.
    const r = calculateLance({
      credit: 145970.16,
      adminRate: 0.12,
      reserveFund: 0.01,
      initialTerm: 100,
      remainingTerm: 78,
      reducedInstallmentRate: 0.4,
      embeddedBidRate: 0.5,
      cashBidRate: 0.16,
      insuranceRate: 0,
    });

    expect(r.insurance).toBe(0);
    expect(r.installment).toBeCloseTo(659.7851232, 6);
    expect(r.postContemplationTermMonths).toBe(76);
    expect(r.postContemplationInstallment).toBeCloseTo(729.2361888, 6);
  });

  it("RATE reproduz a função financeira do Excel", () => {
    expect(rate(56, -2725.666666666667, 110460.53333333333)).toBeCloseTo(0.01207811470190351, 8);
    expect(rate(82, -1171.7363530778166, 72885.140952380956)).toBeCloseTo(0.007011429562540154, 8);
  });
});
