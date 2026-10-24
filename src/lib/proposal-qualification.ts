export const QUALIFICATIONS = [
  { value: "unqualified", label: "Sem qualificação", symbol: "○" },
  { value: "hot", label: "Quente", symbol: "🟢" },
  { value: "warm", label: "Morno", symbol: "🟡" },
  { value: "cold", label: "Frio", symbol: "🔴" },
  { value: "won", label: "Venda fechada", symbol: "🚀" },
  { value: "lost", label: "Perdida", symbol: "✖️" },
] as const;

export type Qualification = (typeof QUALIFICATIONS)[number]["value"];
export function qualificationValue(value: unknown): Qualification {
  return QUALIFICATIONS.find((option) => option.value === value)?.value ?? "unqualified";
}