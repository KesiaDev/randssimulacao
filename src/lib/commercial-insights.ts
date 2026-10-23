export type AnnualResult = { ano: number; revenda: string; meta: number | null; realizado: number | null };
export type MonthlyResult = { ano: number; mes: number; revenda: string; valor: number | null };

// Current-year totals use recorded months, not the stale imported annual snapshot.
// Closed-year snapshots remain untouched; missing months are not recorded zeros.
export function annualRealized(annual: AnnualResult, rows: MonthlyResult[], currentYear: number): number | null {
  if (annual.ano !== currentYear) return annual.realizado;
  const recorded = rows.filter(r => r.ano === annual.ano && r.revenda === annual.revenda && r.valor !== null);
  return recorded.length ? recorded.reduce((sum, row) => sum + (row.valor ?? 0), 0) : annual.realizado;
}

export function changePercent(current: number | null, previous: number | null): number | null {
  return current === null || previous === null || previous === 0 ? null : (current - previous) / previous * 100;
}

export function commercialInsight(annual: AnnualResult, rows: MonthlyResult[], cutoff: number) {
  const month = (year: number, m: number) => rows.find(r => r.revenda === annual.revenda && r.ano === year && r.mes === m)?.valor ?? null;
  const values = Array.from({ length: cutoff }, (_, i) => month(annual.ano, i + 1));
  const complete = cutoff > 0 && values.every(v => v !== null);
  const accumulated = complete ? values.reduce<number>((s, v) => s + (v ?? 0), 0) : null;
  const recent = values.slice(-3);
  const pace = complete ? recent.reduce<number>((s, v) => s + (v ?? 0), 0) / recent.length : null;
  const remaining = 12 - cutoff;
  const projection = accumulated !== null && pace !== null ? accumulated + pace * remaining : null;
  const required = annual.meta !== null && accumulated !== null && remaining > 0 ? Math.max(0, annual.meta - accumulated) / remaining : null;
  const pairs = values.flatMap((v, i) => {
    const previous = month(annual.ano - 1, i + 1);
    return v !== null && previous !== null ? [{ current: v, previous }] : [];
  });
  const previousTotal = pairs.length ? pairs.reduce((s, p) => s + p.previous, 0) : null;
  const currentTotal = pairs.length ? pairs.reduce((s, p) => s + p.current, 0) : null;
  return {
    complete, accumulated, pace, projection, required, remaining,
    recorded: values.filter(v => v !== null).length,
    monthCurrent: month(annual.ano, cutoff),
    monthPrevious: cutoff > 1 ? month(annual.ano, cutoff - 1) : null,
    monthChange: changePercent(month(annual.ano, cutoff), cutoff > 1 ? month(annual.ano, cutoff - 1) : null),
    yearChange: changePercent(currentTotal, previousTotal),
    pairedMonths: pairs.length,
    cautious: accumulated !== null && pace !== null ? accumulated + pace * 0.9 * remaining : null,
    growth: accumulated !== null && pace !== null ? accumulated + pace * 1.1 * remaining : null,
  };
}