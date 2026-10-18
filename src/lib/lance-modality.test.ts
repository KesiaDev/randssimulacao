import { describe, expect, it } from "vitest";
import {
  calculateLance,
  DEFAULT_LANCE_MODALITY,
  lanceInputFromItem,
  minimumReferenceInstallment,
  parseSavedLanceModality,
  simulateLance,
  type LanceSimulation,
  type LanceSimulationInput,
} from "./lance-calc";

/** Grupo 1075 (aba Mascarello) — mesmo caso validado em lance-calc.test.ts. */
const GROUP_1075: Omit<LanceSimulationInput, "modality"> = {
  credit: 400000,
  adminRate: 0.1,
  reserveFund: 0.005,
  initialTerm: 75,
  remainingTerm: 58,
  reducedInstallmentRate: 0.35,
  embeddedBidRate: 0.5,
  cashBidRate: 0.15,
};

function ok(input: LanceSimulationInput): LanceSimulation {
  const result = simulateLance(input);
  if (!result.ok) throw new Error(`esperava simulação válida: ${result.error}`);
  return result.simulation;
}

function error(input: LanceSimulationInput): string {
  const result = simulateLance(input);
  if (result.ok) throw new Error("esperava simulação inválida");
  return result.error;
}

describe("parcela mínima de referência (0,8%)", () => {
  it("crédito R$ 200.000 + taxas R$ 20.000 → R$ 1.760,00", () => {
    expect(minimumReferenceInstallment(220000)).toBeCloseTo(1760, 10);
  });

  it("é calculada a partir de crédito + taxas da proposta", () => {
    const s = ok({
      credit: 200000,
      adminRate: 0.1,
      reserveFund: 0,
      initialTerm: 100,
      remainingTerm: 100,
      reducedInstallmentRate: 1,
      embeddedBidRate: 0.3,
      cashBidRate: 0.1,
      modality: "reduzir_prazo",
    });
    expect(s.feesAmount).toBeCloseTo(20000, 6);
    expect(s.creditWithFees).toBeCloseTo(220000, 6);
    expect(s.minimumInstallment).toBeCloseTo(1760, 10);
  });
});

describe("modalidade do lance", () => {
  it("Reduzir prazo é a modalidade padrão de toda nova simulação", () => {
    expect(DEFAULT_LANCE_MODALITY).toBe("reduzir_prazo");
  });

  it("Reduzir prazo: paga a parcela mínima e encurta o prazo até quitar o saldo", () => {
    const s = ok({ ...GROUP_1075, modality: "reduzir_prazo" });
    expect(s.minimumInstallment).toBeCloseTo(3536, 10);
    expect(s.remainingBalance).toBeCloseTo(152460.53333333333, 6);
    expect(s.currentTermMonths).toBe(56);
    expect(s.newInstallment).toBe(3536);
    expect(s.newTermMonths).toBe(44);
    expect(s.lastInstallment).toBeCloseTo(412.53, 10);
    expect(s.monthsReduced).toBe(12);
    expect(s.installmentDifference).toBeCloseTo(3536 - 2239.4666666666667, 6);
  });

  it("Reduzir prazo: parcelas somadas quitam exatamente o saldo (em centavos)", () => {
    const s = ok({ ...GROUP_1075, modality: "reduzir_prazo" });
    const paid = (s.newTermMonths - 1) * s.newInstallment + s.lastInstallment;
    expect(paid).toBeCloseTo(Math.round(s.remainingBalance * 100) / 100, 6);
    expect(s.lastInstallment).toBeGreaterThan(0);
    expect(s.lastInstallment).toBeLessThanOrEqual(s.newInstallment);
  });

  it("Reduzir parcela: mantém o prazo e reutiliza a regra existente sem alteração", () => {
    const s = ok({ ...GROUP_1075, modality: "reduzir_parcela" });
    expect(s.newTermMonths).toBe(56);
    expect(s.monthsReduced).toBe(0);
    expect(s.newInstallment).toBeCloseTo(2722.5095238095237, 6);
    expect(s.lastInstallment).toBe(s.newInstallment);
    expect(s.minimumInstallment).toBeCloseTo(3536, 10); // exibida só como referência
  });

  it("alternar a modalidade muda só o resultado da simulação", () => {
    const prazo = ok({ ...GROUP_1075, modality: "reduzir_prazo" });
    const parcela = ok({ ...GROUP_1075, modality: "reduzir_parcela" });
    expect(prazo.remainingBalance).toBe(parcela.remainingBalance);
    expect(prazo.bidTotalAmount).toBe(parcela.bidTotalAmount);
    expect(prazo.newTermMonths).toBeLessThan(parcela.newTermMonths);
    expect(ok({ ...GROUP_1075, modality: "reduzir_prazo" })).toEqual(prazo);
  });

  it("aumentar o lance reduz o saldo e o novo prazo", () => {
    const menor = ok({ ...GROUP_1075, cashBidRate: 0.15, modality: "reduzir_prazo" });
    const maior = ok({ ...GROUP_1075, cashBidRate: 0.25, modality: "reduzir_prazo" });
    expect(maior.remainingBalance).toBeLessThan(menor.remainingBalance);
    expect(maior.newTermMonths).toBeLessThan(menor.newTermMonths);
  });

  it("não altera os dados de entrada (proposta original)", () => {
    const input = Object.freeze({ ...GROUP_1075, modality: "reduzir_prazo" as const });
    const copy = { ...input };
    ok(input);
    ok({ ...input, modality: "reduzir_parcela" });
    expect(input).toEqual(copy);
  });
});

describe("validações", () => {
  it.each([
    ["lance vazio", { embeddedBidRate: Number.NaN, cashBidRate: Number.NaN }],
    ["lance zero", { embeddedBidRate: 0, cashBidRate: 0 }],
    ["lance negativo", { embeddedBidRate: -0.1, cashBidRate: 0.2 }],
    ["lance embutido maior que o crédito", { embeddedBidRate: 0.95, cashBidRate: 0 }],
    ["lance que quita todo o saldo", { embeddedBidRate: 0.5, cashBidRate: 0.5 }],
    ["crédito inválido", { credit: 0 }],
    ["taxa inválida", { adminRate: -0.1 }],
    ["prazo do grupo inválido", { initialTerm: 0 }],
    ["prazo restante zero", { remainingTerm: 0 }],
    ["prazo restante maior que o prazo do grupo", { remainingTerm: 80 }],
    ["prazo restante menor que a carência", { remainingTerm: 2 }],
  ])("%s gera mensagem clara, sem resultado", (_label, override) => {
    for (const modality of ["reduzir_prazo", "reduzir_parcela"] as const) {
      expect(error({ ...GROUP_1075, ...override, modality })).toMatch(/\S/);
    }
  });

  it("Reduzir prazo rejeita quando a parcela mínima não quita o saldo no prazo restante", () => {
    const input = { ...GROUP_1075, embeddedBidRate: 0, cashBidRate: 0.01 };
    expect(error({ ...input, modality: "reduzir_prazo" })).toMatch(/Reduzir parcela/);
    expect(simulateLance({ ...input, modality: "reduzir_parcela" }).ok).toBe(true);
  });
});

describe("compatibilidade com simulações existentes", () => {
  it("lances salvos sem modalidade continuam como Reduzir parcela", () => {
    expect(parseSavedLanceModality(null)).toBe("reduzir_parcela");
    expect(parseSavedLanceModality(undefined)).toBe("reduzir_parcela");
    expect(parseSavedLanceModality("reduzir_prazo")).toBe("reduzir_prazo");
  });

  it("Reduzir parcela devolve os mesmos valores de calculateLance", () => {
    const legacy = calculateLance(GROUP_1075);
    const s = ok({ ...GROUP_1075, modality: "reduzir_parcela" });
    expect(s.postContemplationInstallment).toBe(legacy.postContemplationInstallment);
    expect(s.newInstallment).toBe(legacy.postContemplationInstallment);
    expect(s.newTermMonths).toBe(legacy.postContemplationTermMonths);
  });

  it("monta a entrada a partir do item salvo, respeitando a modalidade de contratação", () => {
    const item = {
      credit_value: 400000,
      administration_rate: 0.1,
      reserve_fund: 0.005,
      initial_term: 75,
      remaining_term: 58,
      installment_multiplier: 0.35,
      insurance_rate: 0.0004,
      final_amount: 2239.47,
    };
    const rates = { embeddedBidRate: 0.5, cashBidRate: 0.15 };
    const prorrogada = lanceInputFromItem(item, rates, "reduzir_prazo");
    expect(prorrogada.installmentTerm).toBe(75);
    expect(prorrogada.currentInstallment).toBe(2239.47);
    expect(
      lanceInputFromItem({ ...item, contract_modality: "diluida" }, rates, "reduzir_prazo")
        .installmentTerm,
    ).toBe(58);
  });
});
