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

/**
 * Painel de avisos do Maurício. O sino é pequeno e o painel abre sempre no topo
 * da tela, como as notificações de celular — a posição é fixada no CSS pela
 * regra que envolve [data-notification-shade].
 */
export function MauricioNotifications({ tone = "header" }: { tone?: "header" | "sidebar" }) {
  const { user, isCommercialConsultant } = useAuth();
  const qc = useQueryClient();
  const syncFn = useServerFn(syncReservaNotifications);
  const isMauricio = user?.id === MAURICIO_USER_ID;
  const autorizado = isMauricio || isCommercialConsultant;
  const { reminders, error: reminderError } = useAppointmentReminders();
  const { data: notificacoes } = useQuery({
    queryKey: ["m-notificacoes", user?.id], enabled: isMauricio, refetchInterval: 60000,
    queryFn: async () => (await supabase.from("mauricio_notificacoes").select("*").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });
  useEffect(() => {
    if (!isMauricio) return;
    void syncFn().then(() => qc.invalidateQueries({ queryKey: ["m-notificacoes"] })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMauricio]);

  if (!autorizado) return null;
  const naoLidas = (notificacoes ?? []).filter(n => !n.lida).length + reminders.filter(r => !r.read).length;
  async function readAppointments(items = reminders) {
    const rows = items.map(r => ({ evento_id: r.event.id, user_id: user?.id ?? "", data_evento: r.date, tipo: r.type }));
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
      if (isMauricio) {
        const { error } = await supabase.from("mauricio_notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("lida", false);
        if (error) throw error;
      }
      await readAppointments(); await qc.invalidateQueries({ queryKey: ["m-notificacoes"] });
    } catch { toast.error("Não foi possível marcar todos os avisos como lidos."); }
  }

  const sino = tone === "sidebar"
    ? "size-9 shrink-0 border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    : "size-9 shrink-0 border border-border bg-card text-foreground shadow-none hover:bg-muted";

  return <Popover>
    <PopoverTrigger asChild>
      <Button size="icon" className={`relative ${sino} [&_svg]:size-[18px]`} aria-label="Notificações" title="Compromissos e reservas">
        <Bell strokeWidth={2} />
        {naoLidas > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">{naoLidas}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent
      data-notification-shade=""
      align="end" side="bottom" sideOffset={10}
      className="w-[min(26rem,calc(100vw-1.5rem))] rounded-b-2xl border-x border-b p-0 shadow-2xl data-[state=open]:slide-in-from-top-8 data-[state=open]:duration-200 data-[state=closed]:duration-150"
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-popover px-4 py-3">
        <p className="text-sm font-semibold">Notificações</p>
        {naoLidas > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void marcarTodas()}>Marcar todas como lidas</Button>}
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        {reminderError && <p className="p-4 text-sm text-destructive">Não foi possível carregar os avisos da agenda.</p>}
        {reminders.length > 0 && <p className="bg-muted/50 px-4 py-2 text-xs font-semibold text-primary">Compromissos · hoje e amanhã</p>}
        {reminders.map(r => <div key={r.event.id} className={`border-b px-4 py-3 ${r.read ? "opacity-60" : ""}`}><Button variant="ghost" onClick={() => void markAppointment(r.event.id)} className="h-auto w-full justify-start whitespace-normal px-0 text-left"><CalendarDays className="shrink-0 text-primary" /><span className="min-w-0"><span className="block text-xs font-semibold text-primary">{r.type === "hoje" ? "Hoje" : "Amanhã"} · {r.date.split("-").reverse().join("/")}</span><span className="block break-words">{r.event.titulo}{r.event.revenda ? ` — ${r.event.revenda}` : ""}.</span>{r.event.logistica && <span className="mt-1 block text-xs text-muted-foreground">{r.event.logistica}</span>}<span className="block text-xs text-muted-foreground">{r.read ? "Lida" : "Não lida"}</span></span></Button><Button variant="link" size="sm" asChild className="mt-1 px-0"><Link to="/mauricio/calendario">Abrir calendário →</Link></Button></div>)}
        {(notificacoes ?? []).length > 0 && <p className="bg-muted/50 px-4 py-2 text-xs font-semibold">Reservas de cotas</p>}
        {(notificacoes ?? []).map(n => <Button key={n.id} variant="ghost" onClick={() => void marcarLida(n.id)} className={`block h-auto w-full whitespace-normal rounded-none border-b px-4 py-3 text-left text-sm ${n.lida ? "opacity-60" : ""}`}><span className="block">{n.mensagem}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}{!n.lida && " · não lida"}</span></Button>)}
        {reminders.length === 0 && (notificacoes ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}
