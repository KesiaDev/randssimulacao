import type { CalcResult } from "./calc";

export interface ProposalCalculationItem {
  quantity: number;
  credit: number;
  result: CalcResult;
}

export interface ProposalTotals {
  quantity: number;
  credit: number;
  creditWithFees: number;
  installment: number;
  insurance: number;
  finalAmount: number;
}

export function calculateProposalTotals(items: ProposalCalculationItem[]): ProposalTotals {
  return items.reduce<ProposalTotals>(
    (totals, item) => ({
      quantity: totals.quantity + item.quantity,
      credit: totals.credit + item.credit * item.quantity,
      creditWithFees: totals.creditWithFees + item.result.totalBase * item.quantity,
      installment: totals.installment + item.result.installment * item.quantity,
      insurance: totals.insurance + item.result.insurance * item.quantity,
      finalAmount: totals.finalAmount + item.result.finalAmount * item.quantity,
    }),
    { quantity: 0, credit: 0, creditWithFees: 0, installment: 0, insurance: 0, finalAmount: 0 },
  );
}
