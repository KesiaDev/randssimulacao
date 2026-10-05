/**
 * Motor de cálculo de lance (contemplação por oferta de lance).
 *
 * Fonte original: planilha "Proposta Marlon simulação lance.xlsx", abas
 * "Mascarello" e "Cortina". O saldo devedor foi corrigido a pedido do
 * Mauricio (05/10/2026): a planilha só descontava o seguro, mas o saldo
 * devedor correto desconta a parcela inicial inteira (a que já sai
 * quando a proposta é montada), não só o seguro. A aba "Planilha2" do
 * mesmo arquivo usa ainda outra fórmula (percentual fixo sobre o
 * crédito) e não é usada aqui.
 */

export interface LanceInput {
  /** Valor do crédito contratado (sem taxas) */
  credit: number;
  /** Taxa de administração em decimal (0.10 = 10%) */
  adminRate: number;
  /** Fundo de reserva em decimal (0.005 = 0,5%) */
  reserveFund: number;
  /** Prazo total do grupo, em meses */
  initialTerm: number;
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
  /** Saldo devedor: crédito+taxas menos o lance (embutido + espécie) e uma parcela inicial já paga */
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
    remainingTerm,
    reducedInstallmentRate,
    embeddedBidRate,
    cashBidRate,
    insuranceRate = 0.0004,
    gracePeriodMonths = 2,
  } = input;

  const creditWithFees = credit * (adminRate + reserveFund) + credit;
  const installmentBeforeInsurance =
    initialTerm > 0 ? (creditWithFees / initialTerm) * reducedInstallmentRate : 0;
  const insurance = creditWithFees * insuranceRate;
  const installment = installmentBeforeInsurance + insurance;

  const bidTotalRate = embeddedBidRate + cashBidRate;
  const bidTotalAmount = creditWithFees * bidTotalRate;
  const embeddedBidAmount = creditWithFees * embeddedBidRate;
  const cashBidAmount = creditWithFees * cashBidRate;

  const availableCredit = credit - embeddedBidAmount;
  const remainingBalance = creditWithFees - embeddedBidAmount - cashBidAmount - installment;

  const postContemplationTermMonths = remainingTerm - gracePeriodMonths;
  const postContemplationInstallment =
    postContemplationTermMonths > 0 ? remainingBalance / postContemplationTermMonths : 0;

  const newMoney = credit - installment - embeddedBidAmount - cashBidAmount;
  const effectiveMonthlyCostRate = rate(postContemplationTermMonths, -postContemplationInstallment, newMoney);

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
 * Equivalente à função financeira RATE do Excel/Google Sheets: resolve a
 * taxa periódica `r` tal que
 *   pv * (1+r)^nper + pmt * (1/r + type) * ((1+r)^nper - 1) + fv = 0
 * via Newton-Raphson com derivada numérica (mesma abordagem usada por
 * bibliotecas de planilha de código aberto).
 */
export function rate(nper: number, pmt: number, pv: number, fv = 0, type: 0 | 1 = 0, guess = 0.1): number {
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
