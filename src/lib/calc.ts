/**
 * Motor de cálculo de consórcios.
 *
 * Toda a matemática vive aqui e é alimentada exclusivamente por parâmetros
 * vindos do banco (grupo, faixa, taxa, fundo, multiplicador, seguro).
 * Nenhum valor calculado é fixo no código.
 */

/**
 * Modalidade de contratação: define o prazo usado como divisor da parcela.
 * - prorrogada: prazo inicial do grupo (comportamento histórico)
 * - diluida: meses restantes do grupo
 */
export type ContractModality = "prorrogada" | "diluida";

export const CONTRACT_MODALITIES: Record<ContractModality, { label: string; description: string }> =
  {
    prorrogada: {
      label: "Prorrogada",
      description: "Cálculo da parcela considerando o prazo inicial do grupo.",
    },
    diluida: {
      label: "Diluída",
      description: "Cálculo da parcela considerando os meses restantes do grupo.",
    },
  };

/** Registros sem modalidade (anteriores à Diluída) são tratados como Prorrogada. */
export function parseContractModality(value: unknown): ContractModality {
  return value === "diluida" ? "diluida" : "prorrogada";
}

export function formatContractModality(value: unknown): string {
  return CONTRACT_MODALITIES[parseContractModality(value)].label;
}

export type ContractTermResult = { ok: true; term: number } | { ok: false; error: string };

/** Prazo-base da parcela para a modalidade, com as validações de prazo do grupo. */
export function resolveContractTerm(
  modality: ContractModality,
  initialTerm: number,
  remainingTerm: number,
): ContractTermResult {
  if (!Number.isInteger(initialTerm) || initialTerm <= 0) {
    return { ok: false, error: "O grupo não possui um prazo inicial válido." };
  }
  if (modality === "prorrogada") return { ok: true, term: initialTerm };
  if (!Number.isInteger(remainingTerm) || remainingTerm <= 0) {
    return {
      ok: false,
      error: "O grupo não possui meses restantes válidos para a modalidade Diluída.",
    };
  }
  if (remainingTerm > initialTerm) {
    return { ok: false, error: "Os meses restantes do grupo excedem o prazo inicial." };
  }
  return { ok: true, term: remainingTerm };
}

export interface CalcInput {
  /** Valor do crédito contratado */
  credit: number;
  /** Taxa de administração em decimal (0.10 = 10%) */
  adminRate: number;
  /** Fundo de reserva em decimal (0.01 = 1%) */
  reserveFund: number;
  /** Prazo inicial do grupo, em meses */
  initialTerm: number;
  /** Meses restantes do grupo (obrigatório na modalidade Diluída) */
  remainingTerm?: number;
  /** Modalidade de contratação (padrão: prorrogada) */
  contractModality?: ContractModality;
  /** Multiplicador da modalidade de parcela (1 = integral, 0.4 = reduzida) */
  multiplier: number;
  /** Taxa do seguro em decimal (0.0004 = 0,04%) */
  insuranceRate?: number;
  /** Se o seguro deve ser somado à parcela */
  insuranceIncluded?: boolean;
}

export interface CalcResult {
  /** CRÉDITO + TXS */
  totalBase: number;
  /** Parcela cheia antes do multiplicador */
  baseInstallment: number;
  /** Parcela já com o multiplicador da modalidade */
  installment: number;
  /** Valor do seguro (0 quando não incluído) */
  insurance: number;
  /** Parcela + seguro */
  finalAmount: number;
}

export function calculate(input: CalcInput): CalcResult {
  const {
    credit,
    adminRate,
    reserveFund,
    initialTerm,
    remainingTerm = 0,
    contractModality = "prorrogada",
    multiplier,
    insuranceRate = 0,
    insuranceIncluded = false,
  } = input;

  // Prorrogada mantém exatamente o comportamento histórico (prazo inicial).
  // Diluída exige meses restantes válidos e nunca divide por zero.
  let term = initialTerm;
  if (contractModality === "diluida") {
    const resolved = resolveContractTerm(contractModality, initialTerm, remainingTerm);
    if (!resolved.ok) throw new Error(resolved.error);
    term = resolved.term;
  }

  // CRÉDITO + TXS = CRÉDITO × (TAXA + FUNDO) + CRÉDITO
  const totalBase = credit * (adminRate + reserveFund) + credit;
  const baseInstallment = term > 0 ? totalBase / term : 0;
  const installment = baseInstallment * multiplier;
  const insurance = insuranceIncluded ? totalBase * insuranceRate : 0;

  return {
    totalBase,
    baseInstallment,
    installment,
    insurance,
    finalAmount: installment + insurance,
  };
}

/** Prazo-base de um registro salvo (snapshot), tratando registros antigos como Prorrogada. */
export function savedContractTerm(item: {
  contract_modality?: string | null;
  initial_term: number;
  remaining_term: number;
}): number {
  return parseContractModality(item.contract_modality) === "diluida"
    ? item.remaining_term
    : item.initial_term;
}
