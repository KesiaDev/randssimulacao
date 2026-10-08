const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return brl.format(Number.isFinite(n) ? n : 0);
}

export function formatPercent(rate: number | string | null | undefined): string {
  const n = typeof rate === "string" ? Number(rate) : (rate ?? 0);
  const pct = n * 100;
  const fixed = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2).replace(/0$/, "");
  return `${fixed.replace(".", ",")}%`;
}

export function formatInstallmentType(name: string, multiplier: number | string): string {
  const rate = Number(multiplier);
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) return name;
  const nameWithoutPercent = name.replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?/g, "").trim();
  return `${nameWithoutPercent} ${formatPercent(rate)}`;
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("pt-BR");
}
