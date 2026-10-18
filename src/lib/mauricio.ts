// Módulo de gestão comercial exclusivo do Maurício Palma.
export const MAURICIO_USER_ID = "a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd";

export const REVENDAS = ["Compasi", "Rodoeste", "Multieixo"] as const;

export const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(meta: number | null, realizado: number | null): string {
  if (!meta || meta === 0 || realizado === null) return "—";
  return `${((realizado / meta) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export type ReservaStatus =
  | "ativa"
  | "vence_amanha"
  | "vence_hoje"
  | "vencida"
  | "concluida"
  | "cancelada";

export function reservaStatusEfetivo(status: string, validade: string): ReservaStatus {
  if (status === "concluida" || status === "cancelada") return status;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(validade + "T00:00:00");
  const diffDias = Math.round((v.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return "vencida";
  if (diffDias === 0) return "vence_hoje";
  if (diffDias === 1) return "vence_amanha";
  return "ativa";
}

export const STATUS_LABEL: Record<ReservaStatus, string> = {
  ativa: "Ativa",
  vence_amanha: "Vence amanhã",
  vence_hoje: "Vence hoje",
  vencida: "Vencida",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const STATUS_BADGE: Record<ReservaStatus, string> = {
  ativa: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  vence_amanha: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  vence_hoje: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  vencida: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  concluida: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  cancelada: "bg-muted text-muted-foreground",
};

export const EVENTO_TIPO_COR: Record<string, string> = {
  visita: "bg-blue-500",
  evento: "bg-purple-500",
  feriado: "bg-emerald-500",
  folga: "bg-emerald-300",
  pendencia: "bg-amber-500",
};
