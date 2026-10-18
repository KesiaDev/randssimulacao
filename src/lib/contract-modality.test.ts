import { describe, expect, it } from "vitest";
import {
  calculate,
  formatContractModality,
  parseContractModality,
  resolveContractTerm,
  savedContractTerm,
  type CalcInput,
} from "./calc";
import { formatBRL } from "./format";

/**
 * Exemplo de referência do Grupo 1061 (especificação da modalidade Diluída).
 * Crédito com taxas: 104.264,40 × 1,13 = 117.818,772 (a especificação traz 117.819,372,
 * erro de aritmética; as parcelas de referência 1.178,19 e 1.510,50 seguem válidas).
 * Diluída: 117.818,772 / 78 = 1.510,497… → 1.510,50 arredondado (1.510,49 se truncado).
 */
const GROUP_1061: CalcInput = {
  credit: 104264.4,
  adminRate: 0.12,
  reserveFund: 0.01,
  initialTerm: 100,
  remainingTerm: 78,
  multiplier: 1,
  insuranceRate: 0.0004,
  insuranceIncluded: false,
};

describe("modalidade de contratação", () => {
  it("Prorrogada explícita produz exatamente o mesmo resultado do cálculo histórico", () => {
    const legacy = calculate(withoutRemainingTerm(GROUP_1061));
    const prorrogada = calculate({ ...GROUP_1061, contractModality: "prorrogada" });
    expect(prorrogada).toEqual(legacy);
  });

  it("Prorrogada ignora os meses restantes e divide pelo prazo inicial", () => {
    const r = calculate({ ...GROUP_1061, contractModality: "prorrogada", remainingTerm: 1 });
    expect(r.baseInstallment).toBeCloseTo(r.totalBase / 100, 10);
  });

  it("Diluída divide pelos meses restantes do grupo", () => {
    const r = calculate({ ...GROUP_1061, contractModality: "diluida" });
    expect(r.baseInstallment).toBeCloseTo(r.totalBase / 78, 10);
  });

  it("Grupo 1061 reproduz os valores de referência", () => {
    const prorrogada = calculate({ ...GROUP_1061, contractModality: "prorrogada" });
    const diluida = calculate({ ...GROUP_1061, contractModality: "diluida" });
    expect(prorrogada.totalBase).toBeCloseTo(117818.772, 6);
    expect(diluida.totalBase).toBeCloseTo(117818.772, 6);
    expect(formatBRL(prorrogada.finalAmount)).toBe(formatBRL(1178.19));
    expect(diluida.finalAmount).toBeCloseTo(1510.497077, 6);
    expect(formatBRL(diluida.finalAmount)).toBe(formatBRL(1510.5));
  });

  it("Integral (multiplicador 1) e parcela reduzida mantêm o multiplicador sobre o novo prazo", () => {
    const integral = calculate({ ...GROUP_1061, contractModality: "diluida", multiplier: 1 });
    const reduzida = calculate({ ...GROUP_1061, contractModality: "diluida", multiplier: 0.4 });
    expect(integral.installment).toBeCloseTo(integral.baseInstallment, 10);
    expect(reduzida.installment).toBeCloseTo(integral.baseInstallment * 0.4, 10);
  });

  it("com seguro mantém a regra atual (taxa sobre crédito + taxas), independente da modalidade", () => {
    const prorrogada = calculate({
      ...GROUP_1061,
      contractModality: "prorrogada",
      insuranceIncluded: true,
    });
    const diluida = calculate({
      ...GROUP_1061,
      contractModality: "diluida",
      insuranceIncluded: true,
    });
    expect(diluida.insurance).toBeCloseTo(117818.772 * 0.0004, 8);
    expect(diluida.insurance).toBe(prorrogada.insurance);
    expect(diluida.finalAmount).toBeCloseTo(diluida.installment + diluida.insurance, 10);
  });

  it("sem seguro não adiciona nenhum valor de seguro", () => {
    const r = calculate({ ...GROUP_1061, contractModality: "diluida", insuranceIncluded: false });
    expect(r.insurance).toBe(0);
    expect(r.finalAmount).toBe(r.installment);
  });

  it("taxa de administração e fundo de reserva são aplicados exatamente uma vez", () => {
    const r = calculate({ ...GROUP_1061, contractModality: "diluida" });
    expect(r.totalBase).toBeCloseTo(104264.4 * 1.13, 6);
    expect(r.baseInstallment * 78).toBeCloseTo(104264.4 * 1.13, 6);
  });
});

describe("validação do prazo da modalidade Diluída", () => {
  it.each([
    ["zero", 0],
    ["negativo", -3],
    ["não numérico", Number.NaN],
    ["fracionário", 12.5],
    ["maior que o prazo inicial", 101],
  ])("meses restantes %s impedem o cálculo", (_label, remainingTerm) => {
    expect(resolveContractTerm("diluida", 100, remainingTerm).ok).toBe(false);
    expect(() =>
      calculate({ ...GROUP_1061, contractModality: "diluida", remainingTerm }),
    ).toThrow();
  });

  it("meses restantes ausentes impedem o cálculo da Diluída", () => {
    expect(() =>
      calculate({ ...withoutRemainingTerm(GROUP_1061), contractModality: "diluida" }),
    ).toThrow();
  });

  it("prazo inicial inválido é rejeitado em qualquer modalidade", () => {
    expect(resolveContractTerm("prorrogada", 0, 10).ok).toBe(false);
    expect(resolveContractTerm("diluida", 0, 10).ok).toBe(false);
  });

  it("Prorrogada continua disponível mesmo com o grupo encerrado (0 meses restantes)", () => {
    expect(resolveContractTerm("prorrogada", 100, 0)).toEqual({ ok: true, term: 100 });
  });

  it("meses restantes iguais ao prazo inicial são válidos", () => {
    expect(resolveContractTerm("diluida", 100, 100)).toEqual({ ok: true, term: 100 });
  });
});

describe("compatibilidade e persistência", () => {
  it("registros antigos sem modalidade são tratados como Prorrogada", () => {
    expect(parseContractModality(undefined)).toBe("prorrogada");
    expect(parseContractModality(null)).toBe("prorrogada");
    expect(parseContractModality("")).toBe("prorrogada");
    expect(parseContractModality("desconhecida")).toBe("prorrogada");
  });

  it("registro antigo usa o prazo inicial como prazo-base", () => {
    expect(savedContractTerm({ initial_term: 100, remaining_term: 41 })).toBe(100);
  });

  it("a modalidade salva é restaurada igual ao reabrir a simulação", () => {
    for (const modality of ["prorrogada", "diluida"] as const) {
      const savedRow = JSON.parse(
        JSON.stringify({ contract_modality: modality, initial_term: 100, remaining_term: 78 }),
      );
      expect(parseContractModality(savedRow.contract_modality)).toBe(modality);
      expect(savedContractTerm(savedRow)).toBe(modality === "diluida" ? 78 : 100);
    }
  });

  it("histórico e PDF exibem o rótulo correto da modalidade", () => {
    expect(formatContractModality("diluida")).toBe("Diluída");
    expect(formatContractModality("prorrogada")).toBe("Prorrogada");
    expect(formatContractModality(undefined)).toBe("Prorrogada");
  });
});

function withoutRemainingTerm(input: CalcInput): CalcInput {
  const { remainingTerm: _remainingTerm, ...rest } = input;
  return rest;
}
