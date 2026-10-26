import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { businessDate, nextDate } from "@/lib/commercial-calendar";

export function useReservationReminders() {
  const { user, isCommercialConsultant } = useAuth();
  const today = businessDate();
  return useQuery({
    queryKey: ["m-consultant-reservation-reminders", user?.id, today],
    enabled: isCommercialConsultant,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("mauricio_reservas").select("id,grupo,cota,revenda,validade")
        .eq("status", "ativa").in("validade", [today, nextDate(today)]).order("validade");
      if (error) throw error;
      return data;
    },
  });
}