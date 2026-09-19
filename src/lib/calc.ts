/**
 * Motor de cálculo de consórcios.
 *
 * Toda a matemática vive aqui e é alimentada exclusivamente por parâmetros
 * vindos do banco (grupo, faixa, taxa, fundo, multiplicador, seguro).
 * Nenhum valor calculado é fixo no código.
 */

export interface CalcInput {
  /** Valor do crédito contratado */
  credit: number;
  /** Taxa de administração em decimal (0.10 = 10%) */
  adminRate: number;
  /** Fundo de reserva em decimal (0.01 = 1%) */
  reserveFund: number;
  /** Prazo inicial do grupo, em meses */
  initialTerm: number;
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
    multiplier,
    insuranceRate = 0,
    insuranceIncluded = false,
  } = input;

  // CRÉDITO + TXS = CRÉDITO × (TAXA + FUNDO) + CRÉDITO
  const totalBase = credit * (adminRate + reserveFund) + credit;
  const baseInstallment = initialTerm > 0 ? totalBase / initialTerm : 0;
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
