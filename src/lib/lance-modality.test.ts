import { describe, expect, it } from "vitest";
import {
  calculateLance,
  DEFAULT_LANCE_MODALITY,
  isReduceTermBlocked,
  lanceInputFromItem,
  minimumReferenceInstallment,
  parseSavedLanceModality,
  parseLancePercent,
  resolveLanceModality,
  TERM_EXCEEDS_REMAINING,
  simulateLance,
  type LanceSimulation,
  type LanceSimulationInput,
} from "./lance-calc";

/** Parâmetros legados; saldo corrigido por Padrão/Planilha2!S (desconta K). */
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
    expect(s.remainingBalance).toBeCloseTo(152637.33333333334, 6);
    expect(s.currentTermMonths).toBe(56);
    expect(s.newInstallment).toBe(3536);
    expect(s.newTermMonths).toBe(43);
    expect(s.lastInstallment).toBe(3536);
    expect(s.monthsReduced).toBe(13);
    expect(s.installmentDifference).toBeCloseTo(3536 - 2239.4666666666667, 6);
  });

  it("Reduzir prazo: Grupo 1081 → 165.391,67 / 4.460 = 37 parcelas, sobra desconsiderada", () => {
    const s = ok({
      credit: 500000,
      adminRate: 0.1,
      reserveFund: 0.015,
      initialTerm: 120,
      remainingTerm: 120,
      reducedInstallmentRate: 1,
      embeddedBidRate: 0.5,
      cashBidRate: 0.2,
      insuranceRate: 0,
      modality: "reduzir_prazo",
    });
    expect(s.newInstallment).toBe(4460);
    expect(s.newTermMonths).toBe(Math.floor(s.remainingBalance / 4460));
    expect(s.lastInstallment).toBe(4460);
  });

  it("Reduzir parcela: mantém o prazo conforme Planilha2!V e usa saldo com desconto de K", () => {
    const s = ok({ ...GROUP_1075, modality: "reduzir_parcela" });
    expect(s.newTermMonths).toBe(56);
    expect(s.monthsReduced).toBe(0);
    expect(s.newInstallment).toBeCloseTo(2725.666666666667, 6);
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

/** Exemplos literais de Propostas_Simulação.xlsx; não são a mesma cota. */
describe("exemplos oficiais Padrão e Planilha2", () => {
  const grupo1075 = {
    adminRate: 0.07,
    reserveFund: 0.005,
    initialTerm: 75,
    remainingTerm: 53,
    reducedInstallmentRate: 0.3,
    embeddedBidRate: 0.5,
    insuranceRate: 0,
  };
  it("Padrão!linha 4: V4 = 38,25 truncado para 38 parcelas de 3.440", () => {
    const s = ok({ ...grupo1075, credit: 400000, cashBidRate: 0.19, modality: "reduzir_prazo" });
    expect(s.creditWithFees).toBe(430000); // G4
    expect(s.remainingBalance).toBe(131580); // S4 = G4 - O4 - Q4 - K4
    expect(s.newInstallment).toBe(3440); // U4 = G4 * 0.8%
    expect(s.newTermMonths).toBe(38); // V4 = 38.25 → casas decimais desconsideradas
    expect(s.lastInstallment).toBe(3440);
  });
  it("Planilha2!linha 4: 51 parcelas de 1.247,84 (valor exibido)", () => {
    const s = ok({ ...grupo1075, credit: 200000, cashBidRate: 0.2, modality: "reduzir_parcela" });
    expect(s.creditWithFees).toBe(215000); // G4
    expect(s.remainingBalance).toBe(63640); // S4
    expect(s.newTermMonths).toBe(51); // V4 = E4 - 2
    expect(s.newInstallment).toBeCloseTo(1247.8431372549019, 10); // U4 = S4 / V4
    expect(Math.round(s.newInstallment * 100)).toBe(124784);
  });
  it("Padrão!linha 3: seguro não reduz saldo S3; parcela U3 = 6.300", () => {
    const s = ok({
      credit: 700000,
      adminRate: 0.12,
      reserveFund: 0.005,
      initialTerm: 120,
      remainingTerm: 120,
      reducedInstallmentRate: 0.45,
      embeddedBidRate: 0.35,
      cashBidRate: 0,
      insuranceRate: 0.0004,
      modality: "reduzir_prazo",
    });
    expect(s.insurance).toBe(315); // J3
    expect(s.remainingBalance).toBe(508921.875); // S3 subtracts K3, not I3
    expect(s.newInstallment).toBe(6300); // U3
    expect(s.newTermMonths).toBe(80);
    expect(s.lastInstallment).toBe(6300);
  });
  it("Planilha2!linha 3: nova parcela U3 = S3 / 118", () => {
    const s = ok({
      credit: 700000,
      adminRate: 0.12,
      reserveFund: 0.005,
      initialTerm: 120,
      remainingTerm: 120,
      reducedInstallmentRate: 0.45,
      embeddedBidRate: 0.35,
      cashBidRate: 0,
      insuranceRate: 0.0004,
      modality: "reduzir_parcela",
    });
    expect(s.remainingBalance).toBe(508921.875); // S3
    expect(s.newTermMonths).toBe(118); // V3
    expect(s.newInstallment).toBeCloseTo(4312.8972457627115, 10); // U3
    expect(Math.round(s.newInstallment * 100)).toBe(431290);
  });
});

describe("Reduzir prazo bloqueado quando o novo prazo ultrapassa o prazo restante", () => {
  it("Grupo 915: editar espécie vazia, 20% e 40% recalcula com 35 − 2 meses quando bloqueado", () => {
    const item = {
      credit_value: 229136.45, administration_rate: 0.14, reserve_fund: 0.01,
      initial_term: 100, remaining_term: 35, installment_multiplier: 1,
      insurance_rate: 0, final_amount: 2635.069175,
    };
    const calculate = (cash: string) => {
      const input = lanceInputFromItem(item, {
        embeddedBidRate: parseLancePercent("35"), cashBidRate: parseLancePercent(cash),
      }, DEFAULT_LANCE_MODALITY);
      const modality = resolveLanceModality(input, DEFAULT_LANCE_MODALITY);
      return ok({ ...input, modality });
    };
    const empty = calculate("");
    expect(empty.modality).toBe("reduzir_parcela");
    expect(empty.cashBidAmount).toBe(0);
    expect(empty.newTermMonths).toBe(33);
    expect(empty.newInstallment).toBeCloseTo(5110.437187878788, 8);
    const edited = calculate("20");
    expect(edited.modality).toBe("reduzir_parcela");
    expect(edited.newTermMonths).toBe(33);
    expect(edited.newInstallment).toBeCloseTo(3513.4255666666663, 8);
    const higher = calculate("40");
    expect(higher.modality).toBe("reduzir_prazo");
    expect(higher.newTermMonths).toBe(29);
  });

  it("percentuais aceitam decimal com vírgula e não transformam texto inválido em zero", () => {
    expect(parseLancePercent("16,5")).toBe(0.165);
    expect(parseLancePercent("inválido")).toBeNaN();
  });
  // Lance pequeno: o saldo ÷ parcela mínima passa do prazo restante do grupo (caso do Grupo 920).
  const SMALL_LANCE = { ...GROUP_1075, embeddedBidRate: 0, cashBidRate: 0.01 };

  it("marca o erro com código próprio", () => {
    const result = simulateLance({ ...SMALL_LANCE, modality: "reduzir_prazo" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe(TERM_EXCEEDS_REMAINING);
  });

  it("bloqueia Reduzir prazo e obriga Reduzir parcela", () => {
    expect(isReduceTermBlocked(SMALL_LANCE)).toBe(true);
    expect(resolveLanceModality(SMALL_LANCE, "reduzir_prazo")).toBe("reduzir_parcela");
    expect(simulateLance({ ...SMALL_LANCE, modality: "reduzir_parcela" }).ok).toBe(true);
  });

  it("mantém Reduzir prazo quando o novo prazo cabe no prazo restante", () => {
    expect(isReduceTermBlocked(GROUP_1075)).toBe(false);
    expect(resolveLanceModality(GROUP_1075, "reduzir_prazo")).toBe("reduzir_prazo");
  });

  it("outros erros de validação não bloqueiam Reduzir prazo", () => {
    expect(isReduceTermBlocked({ ...GROUP_1075, embeddedBidRate: 0, cashBidRate: 0 })).toBe(false);
  });

  it("aumentar o lance libera Reduzir prazo de novo", () => {
    expect(isReduceTermBlocked(SMALL_LANCE)).toBe(true);
    expect(isReduceTermBlocked({ ...SMALL_LANCE, cashBidRate: 0.15, embeddedBidRate: 0.5 })).toBe(
      false,
    );
  });
});
