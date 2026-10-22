import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatPct, reservaStatusEfetivo, STATUS_LABEL, STATUS_BADGE } from "@/lib/mauricio";
import { CalendarDays, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { CommercialInsights } from "@/components/CommercialInsights";
import { businessDate } from "@/lib/commercial-calendar";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/mauricio/")({
  head: () => ({ meta: [
    { title: "Gestão Comercial e Perspectiva Estratégica — Randon" },
    { name: "description", content: "Metas, evolução por revenda, comparações históricas e projeções comerciais Randon." },
    { property: "og:title", content: "Gestão Comercial — Randon" },
    { property: "og:description", content: "Resultados, histórico e oportunidades de melhoria comercial por revenda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MauricioDashboard,
});

const ANO = 2026;

function MauricioDashboard() {
  const { isDealerManager, user, managedDealers } = useAuth();
  const { data: metas } = useQuery({
    queryKey: ["m-metas", ANO, user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_metas_anuais").select("*").eq("ano", ANO)).data ?? [],
  });
  const { data: mensais } = useQuery({
    queryKey: ["m-mensais", ANO, user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_resultados_mensais").select("*").eq("ano", ANO)).data ?? [],
  });
  const { data: eventos } = useQuery({
    queryKey: ["m-eventos-proximos", user?.id],
    queryFn: async () =>
      (
        await supabase
          .from("mauricio_eventos")
          .select("*")
          .or(`data.gte.${businessDate()},data_fim.gte.${businessDate()}`)
          .not("status", "in", "(cancelado,concluido)")
          .order("data")
          .limit(5)
      ).data ?? [],
  });
  const { data: reservas } = useQuery({
    queryKey: ["m-reservas", user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_reservas").select("*").eq("status", "ativa")).data ?? [],
  });

  const metaTotal = (metas ?? []).reduce((s, m) => s + (Number(m.meta) || 0), 0);
  const realizadoTotal = (metas ?? []).reduce((s, m) => s + (Number(m.realizado) || 0), 0);
  const falta = metaTotal - realizadoTotal;

  const reservasAtencao = (reservas ?? [])
    .map((r) => ({ ...r, efetivo: reservaStatusEfetivo(r.status, r.validade) }))
    .filter((r) => r.efetivo !== "ativa")
    .sort((a, b) => a.validade.localeCompare(b.validade));

  const porMes = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const total = (mensais ?? [])
      .filter((m) => m.mes === mes)
      .reduce((s, m) => s + (Number(m.valor) || 0), 0);
    return { mes, total };
  });
  const maxMes = Math.max(...porMes.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isDealerManager ? `Resultados · ${managedDealers.map(d => d.name).join(" · ")}` : "Gestão Comercial"}</h1>
        <p className="text-sm text-muted-foreground">Visão geral de metas, resultados, visitas e reservas — {ANO}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" /> Meta anual consolidada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatBRL(metaTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Realizado no ano
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatBRL(realizadoTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% de cumprimento</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatPct(metaTotal, realizadoTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falta para a meta</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatBRL(falta > 0 ? falta : 0)}</CardContent>
        </Card>
      </div>

      <CommercialInsights currentYear={ANO} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado mensal consolidado ({ANO})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {porMes.map((m) => (
              <div key={m.mes} className="flex items-center gap-3">
                <span className="w-8 text-xs text-muted-foreground">
                  {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m.mes - 1]}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary"
                    style={{ width: `${(m.total / maxMes) * 100}%` }}
                  />
                </div>
                <span className="w-28 text-right text-xs font-medium">
                  {m.total > 0 ? formatBRL(m.total) : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desempenho por revenda ({ANO})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(metas ?? []).map((m) => (
              <Link
                key={m.id}
                to="/mauricio/revenda/$nome"
                params={{ nome: m.revenda }}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium text-primary">{m.revenda}</p>
                  <p className="text-xs text-muted-foreground">
                    Meta {formatBRL(Number(m.meta))} · Realizado {formatBRL(Number(m.realizado))}
                  </p>
                </div>
                <Badge variant="secondary">{formatPct(Number(m.meta), Number(m.realizado))}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Próximas visitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(eventos ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma visita futura cadastrada.</p>
            )}
            {(eventos ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{e.titulo}</p>
                  {e.logistica && <p className="text-xs text-muted-foreground">{e.logistica}</p>}
                </div>
                <span className="text-xs font-medium">
                  {e.data.split("-").reverse().join("/")}
                </span>
              </div>
            ))}
            {!isDealerManager && <Link to="/mauricio/calendario" className="block text-sm font-medium text-primary hover:underline">
              Abrir calendário completo →
            </Link>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" /> Reservas que exigem atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reservasAtencao.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma reserva vencida ou próxima do vencimento.</p>
            )}
            {reservasAtencao.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    Grupo {r.grupo} · Cota {r.cota} — {r.revenda}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.vendedor ?? "Sem vendedor"} · Validade {r.validade.split("-").reverse().join("/")}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.efetivo]}`}>
                  {STATUS_LABEL[r.efetivo]}
                </span>
              </div>
            ))}
            {!isDealerManager && <Link to="/mauricio/reservas" className="block text-sm font-medium text-primary hover:underline">
              Ver todas as reservas →
            </Link>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
