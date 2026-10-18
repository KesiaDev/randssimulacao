/**
 * Motor de cálculo de lance (contemplação por oferta de lance).
 *
 * Fonte: "Propostas_Simulação.xlsx", abas "Padrão" e "Planilha2".
 * S3/S4 descontam a parcela SEM seguro (K), não a parcela com seguro (I).
 * Padrão!U = G × 0,8%; V = S / U. Planilha2!V = E − 2; U = S / V.
 * Prazo fracionário é quitado com última parcela menor, confirmado pela
 * solicitante: Padrão!V4 = 38,25 → 38 × 3.440 + última de 860.
 */

import { savedContractTerm } from "./calc";

export interface LanceInput {
  /** Valor do crédito contratado (sem taxas) */
  credit: number;
  /** Taxa de administração em decimal (0.10 = 10%) */
  adminRate: number;
  /** Fundo de reserva em decimal (0.005 = 0,5%) */
  reserveFund: number;
  /** Prazo total do grupo, em meses */
  initialTerm: number;
  /**
   * Prazo-base da parcela atual da proposta (padrão: initialTerm). Na
   * modalidade de contratação Diluída é o prazo restante salvo no item.
   */
  installmentTerm?: number;
  /** Prazo restante do grupo até este momento, em meses */
  remainingTerm: number;
  /** Percentual da parcela negociado para este lance, em decimal (ex.: 0.35) */
  reducedInstallmentRate: number;
  /** Percentual do lance embutido (tirado da própria carta), em decimal */
  embeddedBidRate: number;
  /** Percentual do lance em espécie (pago do bolso do cliente), em decimal */
  cashBidRate: number;
  /** Taxa do seguro em decimal (0.0004 = 0,04%) */
  insuranceRate?: number;
  /** Meses sem cobrança entre a contemplação e a retomada das parcelas */
  gracePeriodMonths?: number;
}

export interface LanceResult {
  /** CRÉDITO + TXS */
  creditWithFees: number;
  /** Parcela sem seguro, pelo percentual negociado */
  installmentBeforeInsurance: number;
  /** Valor do seguro */
  insurance: number;
  /** Parcela com seguro */
  installment: number;
  /** Soma dos percentuais de lance embutido + espécie */
  bidTotalRate: number;
  /** Valor total do lance (embutido + espécie) */
  bidTotalAmount: number;
  /** Valor do lance embutido, em R$ */
  embeddedBidAmount: number;
  /** Valor do lance em espécie, em R$ */
  cashBidAmount: number;
  /** Crédito que resta disponível após o lance embutido */
  availableCredit: number;
  /** Padrão/Planilha2!S: crédito+taxas menos lances e parcela inicial SEM seguro */
  remainingBalance: number;
  /** Novo prazo restante após a carência pós-contemplação */
  postContemplationTermMonths: number;
  /** Nova parcela após a contemplação */
  postContemplationInstallment: number;
  /** Dinheiro novo: diferença entre o crédito e o que o cliente pagou/tirou de lance */
  newMoney: number;
  /** Custo efetivo mensal implícito na operação (equivalente à função RATE do Excel) */
  effectiveMonthlyCostRate: number;
}

export function calculateLance(input: LanceInput): LanceResult {
  const {
    credit,
    adminRate,
    reserveFund,
    initialTerm,
    installmentTerm = initialTerm,
    remainingTerm,
    reducedInstallmentRate,
    embeddedBidRate,
    cashBidRate,
    insuranceRate = 0.0004,
    gracePeriodMonths = 2,
  } = input;

  const creditWithFees = credit * (adminRate + reserveFund) + credit;
  const installmentBeforeInsurance =
    installmentTerm > 0 ? (creditWithFees / installmentTerm) * reducedInstallmentRate : 0;
  const insurance = creditWithFees * insuranceRate;
  const installment = installmentBeforeInsurance + insurance;

  const bidTotalRate = embeddedBidRate + cashBidRate;
  const bidTotalAmount = creditWithFees * bidTotalRate;
  const embeddedBidAmount = creditWithFees * embeddedBidRate;
  const cashBidAmount = creditWithFees * cashBidRate;

  const availableCredit = credit - embeddedBidAmount;
  const remainingBalance = creditWithFees - embeddedBidAmount - cashBidAmount - installmentBeforeInsurance;

  const postContemplationTermMonths = remainingTerm - gracePeriodMonths;
  const postContemplationInstallment =
    postContemplationTermMonths > 0 ? remainingBalance / postContemplationTermMonths : 0;

  const newMoney = credit - installment - embeddedBidAmount - cashBidAmount;
  const effectiveMonthlyCostRate = rate(
    postContemplationTermMonths,
    -postContemplationInstallment,
    newMoney,
  );

  return {
    creditWithFees,
    installmentBeforeInsurance,
    insurance,
    installment,
    bidTotalRate,
    bidTotalAmount,
    embeddedBidAmount,
    cashBidAmount,
    availableCredit,
    remainingBalance,
    postContemplationTermMonths,
    postContemplationInstallment,
    newMoney,
    effectiveMonthlyCostRate,
  };
}

/**
 * Modalidade de aplicação do lance.
 * - reduzir_prazo: padrão da empresa. Após a contemplação o cliente paga a
 *   parcela mínima de referência (0,8% de crédito + taxas) e o prazo
 *   encurta até quitar o saldo devedor.
 * - reduzir_parcela: mantém o prazo restante (menos a carência) e
 *   recalcula a parcela — é a regra original de `calculateLance`.
 */
export type LanceModality = "reduzir_prazo" | "reduzir_parcela";

/** Modalidade selecionada automaticamente em toda nova simulação de lance. */
export const DEFAULT_LANCE_MODALITY: LanceModality = "reduzir_prazo";

export const LANCE_MODALITIES: Record<LanceModality, { label: string; description: string }> = {
  reduzir_prazo: {
    label: "Reduzir prazo",
    description: "Recomendado pela empresa: quita o contrato o mais rápido possível.",
  },
  reduzir_parcela: {
    label: "Reduzir parcela",
    description: "Alternativa para diminuir o compromisso mensal, mantendo o prazo.",
  },
};

/** Regra da empresa: parcela mínima de referência = (crédito + taxas) × 0,8%. */
export const MINIMUM_INSTALLMENT_RATE = 0.008;

export function minimumReferenceInstallment(creditWithFees: number): number {
  return creditWithFees * MINIMUM_INSTALLMENT_RATE;
}

/**
 * Modalidade de um lance já salvo. Lances salvos antes da escolha de
 * modalidade foram calculados como Reduzir parcela.
 */
export function parseSavedLanceModality(value: unknown): LanceModality {
  return value === "reduzir_prazo" ? "reduzir_prazo" : "reduzir_parcela";
}

export interface LanceSimulationInput extends LanceInput {
  modality: LanceModality;
  /** Parcela atual da proposta, para comparação (padrão: parcela calculada pelo lance) */
  currentInstallment?: number;
}

export interface LanceSimulation extends LanceResult {
  modality: LanceModality;
  /** Total de taxas (administração + fundo de reserva) */
  feesAmount: number;
  /** Parcela mínima de referência: (crédito + taxas) × 0,8% */
  minimumInstallment: number;
  /** Parcela atual da proposta */
  currentInstallment: number;
  /** Prazo após a carência sem reduzir prazo, em meses */
  currentTermMonths: number;
  /** Prazo simulado após a contemplação, em meses inteiros */
  newTermMonths: number;
  /** Parcela mensal simulada após a contemplação */
  newInstallment: number;
  /** Última parcela (menor quando o saldo não divide exatamente pela parcela mínima) */
  lastInstallment: number;
  /** Meses a menos em relação ao prazo atual */
  monthsReduced: number;
  /** Nova parcela − parcela atual (negativo = parcela menor) */
  installmentDifference: number;
}

export type LanceSimulationResult =
  { ok: true; simulation: LanceSimulation } | { ok: false; error: string };

const isNonNegative = (value: number) => Number.isFinite(value) && value >= 0;

/** Simulação de lance com validações; nunca altera o input nem os dados da proposta. */
export function simulateLance(input: LanceSimulationInput): LanceSimulationResult {
  const { credit, adminRate, reserveFund, initialTerm, remainingTerm, reducedInstallmentRate } =
    input;
  const installmentTerm = input.installmentTerm ?? initialTerm;
  const { embeddedBidRate, cashBidRate, gracePeriodMonths = 2 } = input;

  if (!Number.isFinite(credit) || credit <= 0) return { ok: false, error: "Crédito inválido." };
  if (!isNonNegative(adminRate) || !isNonNegative(reserveFund))
    return { ok: false, error: "Taxas inválidas." };
  if (!Number.isInteger(initialTerm) || initialTerm <= 0)
    return { ok: false, error: "Prazo do grupo inválido." };
  if (!Number.isInteger(installmentTerm) || installmentTerm <= 0 || installmentTerm > initialTerm) {
    return { ok: false, error: "Prazo-base da parcela inválido." };
  }
  if (!Number.isInteger(remainingTerm) || remainingTerm <= 0 || remainingTerm > initialTerm) {
    return { ok: false, error: "Prazo restante do grupo inválido." };
  }
  if (
    !Number.isFinite(reducedInstallmentRate) ||
    reducedInstallmentRate <= 0 ||
    reducedInstallmentRate > 1
  ) {
    return { ok: false, error: "Percentual da parcela inválido." };
  }
  if (!isNonNegative(embeddedBidRate) || !isNonNegative(cashBidRate)) {
    return { ok: false, error: "Os percentuais de lance não podem ser negativos." };
  }
  if (embeddedBidRate + cashBidRate <= 0)
    return { ok: false, error: "Informe um lance maior que zero." };

  const base = calculateLance(input);
  if (base.availableCredit < 0)
    return { ok: false, error: "O lance embutido não pode ser maior que o crédito." };
  if (base.remainingBalance <= 0) {
    return {
      ok: false,
      error: "O lance quita todo o saldo devedor; reduza o percentual de lance.",
    };
  }
  if (base.postContemplationTermMonths <= 0) {
    return { ok: false, error: "O prazo restante não comporta a carência após a contemplação." };
  }

  const minimumInstallment = minimumReferenceInstallment(base.creditWithFees);
  const currentInstallment = input.currentInstallment ?? base.installment;
  const currentTermMonths = base.postContemplationTermMonths;

  let newTermMonths = currentTermMonths;
  let newInstallment = base.postContemplationInstallment;
  let lastInstallment = newInstallment;

  if (input.modality === "reduzir_prazo") {
    // Em centavos para o número de parcelas não depender de ruído de ponto flutuante.
    const balanceCents = Math.round(base.remainingBalance * 100);
    const minimumCents = Math.round(minimumInstallment * 100);
    if (minimumCents <= 0) return { ok: false, error: "Parcela mínima de referência inválida." };
    // Regra confirmada: V = S / U truncado; a sobra fracionária é desconsiderada.
    newTermMonths = Math.floor(balanceCents / minimumCents);
    if (newTermMonths > currentTermMonths) {
      return {
        ok: false,
        error:
          "A parcela mínima de 0,8% não quita o saldo dentro do prazo restante. Use Reduzir parcela.",
      };
    }
    if (newTermMonths < 1) {
      newTermMonths = 1;
      newInstallment = balanceCents / 100;
    } else {
      newInstallment = minimumCents / 100;
    }
    lastInstallment = newInstallment;
  }

  return {
    ok: true,
    simulation: {
      ...base,
      modality: input.modality,
      feesAmount: base.creditWithFees - credit,
      minimumInstallment,
      currentInstallment,
      currentTermMonths,
      newTermMonths,
      newInstallment,
      lastInstallment,
      monthsReduced: currentTermMonths - newTermMonths,
      installmentDifference: newInstallment - currentInstallment,
    },
  };
}

/** Dados de um item salvo da proposta (snapshot), sem consultar a configuração atual do grupo. */
export interface LanceItemSnapshot {
  credit_value: number;
  administration_rate: number;
  reserve_fund: number;
  initial_term: number;
  remaining_term: number;
  contract_modality?: string | null;
  installment_multiplier: number;
  insurance_rate: number;
  final_amount: number;
}

export function lanceInputFromItem(
  item: LanceItemSnapshot,
  rates: { embeddedBidRate: number; cashBidRate: number },
  modality: LanceModality,
): LanceSimulationInput {
  return {
    credit: Number(item.credit_value),
    adminRate: Number(item.administration_rate),
    reserveFund: Number(item.reserve_fund),
    initialTerm: item.initial_term,
    installmentTerm: savedContractTerm(item),
    remainingTerm: item.remaining_term,
    reducedInstallmentRate: Number(item.installment_multiplier),
    insuranceRate: Number(item.insurance_rate),
    currentInstallment: Number(item.final_amount),
    ...rates,
    modality,
  };
}

/**
 * Equivalente à função financeira RATE do Excel/Google Sheets: resolve a
 * taxa periódica `r` tal que
 *   pv * (1+r)^nper + pmt * (1/r + type) * ((1+r)^nper - 1) + fv = 0
 * via Newton-Raphson com derivada numérica (mesma abordagem usada por
 * bibliotecas de planilha de código aberto).
 */
export function rate(
  nper: number,
  pmt: number,
  pv: number,
  fv = 0,
  type: 0 | 1 = 0,
  guess = 0.1,
): number {
  const epsMax = 1e-10;
  const iterMax = 100;
  const dr = 1e-6;
  let r = guess;

  const residual = (x: number) => {
    if (Math.abs(x) < epsMax) return pv * (1 + nper * pmt) + pmt * nper + fv;
    const f = Math.pow(1 + x, nper);
    return pv * f + pmt * (1 / x + type) * (f - 1) + fv;
  };

  for (let i = 0; i < iterMax; i += 1) {
    const y = residual(r);
    if (Math.abs(y) < epsMax) return r;
    const derivative = (residual(r + dr) - y) / dr;
    if (derivative === 0) break;
    r = r - y / derivative;
  }
  return r;
}
