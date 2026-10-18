import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAURICIO_USER_ID } from "@/lib/mauricio";

// Gera as notificações de reserva (véspera e dia do vencimento) para o
// Maurício. Roda quando ele entra na plataforma e após criar/editar reservas.
// A unicidade (reserva_id, tipo) evita duplicações.
export const syncReservaNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== MAURICIO_USER_ID) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const hoje = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const hojeIso = iso(hoje);
    const amanhaIso = iso(new Date(hoje.getTime() + 86400000));

    const { data: reservas, error } = await supabaseAdmin
      .from("mauricio_reservas")
      .select("id, grupo, cota, vendedor, revenda, validade, status")
      .in("status", ["ativa"])
      .in("validade", [hojeIso, amanhaIso]);
    if (error) throw new Error(error.message);

    const fmtData = (d: string) => d.split("-").reverse().join("/");
    const rows = (reservas ?? []).map((r) => {
      const tipo = r.validade === hojeIso ? "vencimento" : "vespera";
      const base = `a reserva da cota ${r.cota}, do grupo ${r.grupo}, vinculada à revenda ${r.revenda}` +
        (r.vendedor ? ` e ao vendedor ${r.vendedor}` : "");
      const mensagem =
        tipo === "vencimento"
          ? `🚨 Maurício, ${base} vence hoje, ${fmtData(r.validade)}. Verifique a situação desta reserva.`
          : `⚠️ Atenção, Maurício! ${base} vence amanhã, ${fmtData(r.validade)}.`;
      return {
        user_id: MAURICIO_USER_ID,
        reserva_id: r.id,
        tipo,
        mensagem,
      };
    });

    if (rows.length > 0) {
      const { error: upErr } = await supabaseAdmin
        .from("mauricio_notificacoes")
        .upsert(rows, { onConflict: "reserva_id,tipo", ignoreDuplicates: true });
      if (upErr) throw new Error(upErr.message);
    }
    return { geradas: rows.length };
  });
