export function validHistoryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function historyRangeError(from: string, to: string): string | null {
  if ((from && !validHistoryDate(from)) || (to && !validHistoryDate(to))) return "Informe datas válidas.";
  return from && to && from > to ? "A data “Até” deve ser igual ou posterior à data “De”." : null;
}