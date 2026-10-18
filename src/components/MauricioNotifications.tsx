import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MAURICIO_USER_ID } from "@/lib/mauricio";
import { syncReservaNotifications } from "@/lib/mauricio.functions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function MauricioNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const syncFn = useServerFn(syncReservaNotifications);
  const autorizado = user?.id === MAURICIO_USER_ID;

  const { data: notificacoes } = useQuery({
    queryKey: ["m-notificacoes"],
    enabled: autorizado,
    refetchInterval: 60000,
    queryFn: async () =>
      (
        await supabase
          .from("mauricio_notificacoes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? [],
  });

  // Gera alertas pendentes ao entrar na plataforma (não depende de agendamento).
  useEffect(() => {
    if (!autorizado) return;
    void syncFn().then(() => qc.invalidateQueries({ queryKey: ["m-notificacoes"] })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado]);

  if (!autorizado) return null;

  const naoLidas = (notificacoes ?? []).filter((n) => !n.lida);

  async function marcarLida(id: string) {
    await supabase
      .from("mauricio_notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("id", id);
    void qc.invalidateQueries({ queryKey: ["m-notificacoes"] });
  }

  async function marcarTodas() {
    await supabase
      .from("mauricio_notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("lida", false);
    void qc.invalidateQueries({ queryKey: ["m-notificacoes"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {naoLidas.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {naoLidas.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {naoLidas.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void marcarTodas()}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(notificacoes ?? []).length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação.</p>
          )}
          {(notificacoes ?? []).map((n) => (
            <button
              key={n.id}
              onClick={() => void marcarLida(n.id)}
              className={`block w-full border-b px-4 py-3 text-left text-sm transition-colors hover:bg-accent ${
                n.lida ? "opacity-60" : ""
              }`}
            >
              <p>{n.mensagem}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString("pt-BR")}
                {!n.lida && " · não lida"}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
