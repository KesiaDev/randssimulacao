import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MAURICIO_USER_ID } from "@/lib/mauricio";
import { syncReservaNotifications } from "@/lib/mauricio.functions";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export function MauricioNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const syncFn = useServerFn(syncReservaNotifications);
  const autorizado = user?.id === MAURICIO_USER_ID;
  const { reminders, error: reminderError } = useAppointmentReminders();
  const { data: notificacoes } = useQuery({
    queryKey: ["m-notificacoes"], enabled: autorizado, refetchInterval: 60000,
    queryFn: async () => (await supabase.from("mauricio_notificacoes").select("*").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });
  useEffect(() => {
    if (!autorizado) return;
    void syncFn().then(() => qc.invalidateQueries({ queryKey: ["m-notificacoes"] })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado]);
  if (!autorizado) return null;
  const naoLidas = (notificacoes ?? []).filter(n => !n.lida).length + reminders.filter(r => !r.read).length;
  async function readAppointments(items = reminders) {
    const rows = items.map(r => ({ evento_id: r.event.id, user_id: MAURICIO_USER_ID, data_evento: r.date, tipo: r.type }));
    if (rows.length) {
      const { error } = await supabase.from("mauricio_evento_leituras").upsert(rows, { onConflict: "evento_id,user_id,data_evento,tipo" });
      if (error) throw error;
    }
    await qc.invalidateQueries({ queryKey: ["m-compromissos-leituras"] });
  }
  async function markAppointment(id: string) {
    try { await readAppointments(reminders.filter(r => r.event.id === id)); } catch { toast.error("Não foi possível marcar o aviso como lido."); }
  }
  async function marcarLida(id: string) {
    const { error } = await supabase.from("mauricio_notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Não foi possível marcar o aviso como lido."); return; }
    await qc.invalidateQueries({ queryKey: ["m-notificacoes"] });
  }
  async function marcarTodas() {
    try {
      const { error } = await supabase.from("mauricio_notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("lida", false);
      if (error) throw error;
      await readAppointments(); await qc.invalidateQueries({ queryKey: ["m-notificacoes"] });
    } catch { toast.error("Não foi possível marcar todos os avisos como lidos."); }
  }
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label="Notificações" title="Compromissos e reservas"><Bell className="h-5 w-5" />{naoLidas > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{naoLidas}</span>}</Button></PopoverTrigger><PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="end"><div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><p className="text-sm font-semibold">Notificações</p>{naoLidas > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void marcarTodas()}>Marcar todas como lidas</Button>}</div><div className="max-h-96 overflow-y-auto">
    {reminderError && <p className="p-4 text-sm text-destructive">Não foi possível carregar os avisos da agenda.</p>}
    {reminders.length > 0 && <p className="bg-muted/50 px-4 py-2 text-xs font-semibold text-primary">Compromissos · hoje e amanhã</p>}
    {reminders.map(r => <div key={r.event.id} className={`border-b px-4 py-3 ${r.read ? "opacity-60" : ""}`}><Button variant="ghost" onClick={() => void markAppointment(r.event.id)} className="h-auto w-full justify-start whitespace-normal px-0 text-left"><CalendarDays className="shrink-0 text-primary" /><span className="min-w-0"><span className="block text-xs font-semibold text-primary">{r.type === "hoje" ? "Hoje" : "Amanhã"} · {r.date.split("-").reverse().join("/")}</span><span className="block break-words">Maurício, {r.event.titulo}{r.event.revenda ? ` — ${r.event.revenda}` : ""}.</span>{r.event.logistica && <span className="mt-1 block text-xs text-muted-foreground">{r.event.logistica}</span>}<span className="block text-xs text-muted-foreground">{r.read ? "Lida" : "Não lida"}</span></span></Button><Button variant="link" size="sm" asChild className="mt-1 px-0"><Link to="/mauricio/calendario">Abrir calendário →</Link></Button></div>)}
    {(notificacoes ?? []).length > 0 && <p className="bg-muted/50 px-4 py-2 text-xs font-semibold">Reservas de cotas</p>}
    {(notificacoes ?? []).map(n => <Button key={n.id} variant="ghost" onClick={() => void marcarLida(n.id)} className={`block h-auto w-full whitespace-normal rounded-none border-b px-4 py-3 text-left text-sm ${n.lida ? "opacity-60" : ""}`}><span className="block">{n.mensagem}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}{!n.lida && " · não lida"}</span></Button>)}
    {reminders.length === 0 && (notificacoes ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação.</p>}
  </div></PopoverContent></Popover>;
}
