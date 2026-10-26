import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MAURICIO_USER_ID } from "@/lib/mauricio";
import { appointmentReminder, businessDate, nextDate } from "@/lib/commercial-calendar";

export function useAppointmentReminders() {
  const { user, isCommercialConsultant } = useAuth();
  const today = businessDate();
  const enabled = user?.id === MAURICIO_USER_ID || isCommercialConsultant;
  const events = useQuery({
    queryKey: ["m-compromissos-avisos", today, user?.id], enabled, refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("mauricio_eventos").select("*").lte("data", nextDate(today)).or(`data_fim.gte.${today},data.gte.${today}`).not("status", "in", "(cancelado,concluido)").order("data");
      if (error) throw error;
      return data;
    },
  });
  const reads = useQuery({
    queryKey: ["m-compromissos-leituras", today, user?.id], enabled, refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("mauricio_evento_leituras").select("evento_id,data_evento,tipo").gte("data_evento", today).lte("data_evento", nextDate(today));
      if (error) throw error;
      return data;
    },
  });
  const reminders = (events.data ?? []).flatMap(event => {
    const type = appointmentReminder(event, today);
    if (!type) return [];
    const date = type === "hoje" ? today : event.data;
    const read = (reads.data ?? []).some(r => r.evento_id === event.id && r.data_evento === date && r.tipo === type);
    return [{ event, type, date, read }];
  });
  return { reminders, loading: events.isPending || reads.isPending, error: events.error ?? reads.error };
}