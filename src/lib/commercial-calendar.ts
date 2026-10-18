import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CalendarEvent = Database["public"]["Tables"]["mauricio_eventos"]["Row"];
export const EVENT_LABELS: Record<string, string> = { visita: "Visita comercial", evento: "Evento / convenção", feriado: "Feriado", folga: "Folga / férias", pendencia: "Pendência" };
export const EVENT_TONES: Record<string, string> = { visita: "border-primary bg-primary/10 text-primary", evento: "border-chart-2 bg-chart-2/10 text-foreground", feriado: "border-success bg-success/10 text-foreground", folga: "border-chart-4 bg-chart-4/10 text-foreground", pendencia: "border-chart-5 bg-chart-5/10 text-foreground" };
export function businessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function nextDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
export function occursOn(event: Pick<CalendarEvent, "data" | "data_fim">, date: string) {
  return event.data <= date && (event.data_fim ?? event.data) >= date;
}
export function appointmentReminder(event: Pick<CalendarEvent, "data" | "data_fim" | "status">, today: string): "hoje" | "amanha" | null {
  if (["cancelado", "concluido"].includes(event.status)) return null;
  if (occursOn(event, today)) return "hoje";
  return event.data === nextDate(today) ? "amanha" : null;
}
export async function deleteCalendarEvent(client: Pick<SupabaseClient<Database>, "from">, id: string) {
  const { data, error } = await client.from("mauricio_eventos").delete().eq("id", id).select("id").single();
  if (error) throw new Error(error.message);
  if (!data || data.id !== id) throw new Error("Não foi possível confirmar a exclusão do compromisso.");
}
export const EVENT_QUERY_KEYS = ["m-eventos", "m-eventos-proximos", "m-rev-eventos", "m-compromissos-avisos", "m-compromissos-leituras"];