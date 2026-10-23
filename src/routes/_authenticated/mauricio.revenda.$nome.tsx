import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatBRL, formatPct, reservaStatusEfetivo, STATUS_LABEL, STATUS_BADGE, MESES } from "@/lib/mauricio";
import { ArrowLeft, Pencil, CalendarDays, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { annualRealized } from "@/lib/commercial-insights";

export const Route = createFileRoute("/_authenticated/mauricio/revenda/$nome")({
  head: ({ params }) => ({ meta: [
    { title: `${params.nome} — Gestão Comercial Randon` },
    { name: "description", content: `Metas, resultados, reservas e visitas comerciais da revenda ${params.nome}.` },
    { property: "og:title", content: `${params.nome} — Gestão Comercial Randon` },
    { property: "og:description", content: `Acompanhamento comercial e histórico da revenda ${params.nome}.` },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: RevendaDetalhe,
});

const ANO = 2026;

function RevendaDetalhe() {
  const { nome } = Route.useParams();
  const { user, isDealerManager } = useAuth();
  const qc = useQueryClient();
  const [editando, setEditando] = useState<number | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");

  const { data: anuais } = useQuery({
    queryKey: ["m-rev-anuais", nome, user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_metas_anuais").select("*").eq("revenda", nome).order("ano")).data ?? [],
  });
  const { data: mensais } = useQuery({
    queryKey: ["m-rev-mensais", nome, ANO, user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_resultados_mensais").select("*").eq("revenda", nome).eq("ano", ANO)).data ?? [],
  });
  const { data: reservas } = useQuery({
    queryKey: ["m-rev-reservas", nome, user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_reservas").select("*").eq("revenda", nome).order("validade")).data ?? [],
  });
  const { data: eventos } = useQuery({
    queryKey: ["m-rev-eventos", nome, user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_eventos").select("*").eq("revenda", nome).order("data", { ascending: false }).limit(10))
        .data ?? [],
  });

  const anoAtual = (anuais ?? []).find((m) => m.ano === ANO);
  const meta = anoAtual?.meta ?? null;
  const realizado = anoAtual ? annualRealized(anoAtual, mensais ?? [], ANO) : null;

  function valorMes(mes: number): number | null {
    const row = (mensais ?? []).find((m) => m.mes === mes);
    return row?.valor ?? null;
  }

  async function salvarMensal(mes: number) {
    if (isDealerManager) return;
    const num = valorEdicao.trim() === "" ? null : Number(valorEdicao.replace(",", "."));
    if (num !== null && Number.isNaN(num)) {
      toast.error("Valor inválido");
      return;
    }
    const { error } = await supabase
      .from("mauricio_resultados_mensais")
      .upsert({ ano: ANO, mes, revenda: nome, valor: num }, { onConflict: "ano,mes,revenda" });
    if (error) toast.error(error.message);
    else {
      toast.success("Valor atualizado");
      setEditando(null);
      void qc.invalidateQueries({ queryKey: ["m-rev-mensais"] });
      void qc.invalidateQueries({ queryKey: ["m-mensais"] });
      void qc.invalidateQueries({ queryKey: ["m-strategy-monthly"] });
    }
  }

  if (!anoAtual) {
    return (
      <div className="space-y-4">
        <Link to="/mauricio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum dado encontrado para a revenda “{nome}”.
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxMes = Math.max(
    ...(mensais ?? []).map((m) => Number(m.valor) || 0),
    1,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link to="/mauricio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{nome}</h1>
        <p className="text-sm text-muted-foreground">Dados exclusivos desta revenda — {ANO}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" /> Meta {ANO}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatBRL(meta)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Realizado {ANO}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatBRL(realizado)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% de cumprimento</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatPct(meta, realizado)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falta para a meta</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatBRL(meta !== null && realizado !== null ? Math.max(0, meta - realizado) : null)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado mensal — {ANO}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {MESES.map((_, i) => {
            const mes = i + 1;
            const v = valorMes(mes);
            const key = `mes-${mes}`;
            return (
              <div key={mes} className="flex items-center gap-3">
                <span className="w-8 text-xs text-muted-foreground">{MESES[i]}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                  {v !== null && <div className="h-full rounded bg-primary" style={{ width: `${(v / maxMes) * 100}%` }} />}
                </div>
                {editando === mes ? (
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-7 w-24 text-right text-xs"
                      value={valorEdicao}
                      onChange={(e) => setValorEdicao(e.target.value)}
                      autoFocus
                    />
                    <Button size="sm" className="h-7 px-2" onClick={() => void salvarMensal(mes)}>
                      OK
                    </Button>
                  </div>
                ) : (
                  <button
                    className="group inline-flex items-center gap-1"
                    disabled={isDealerManager}
                    onClick={() => {
                      setEditando(mes);
                      setValorEdicao(v !== null ? String(v) : "");
                    }}
                    title={isDealerManager ? "Resultado registrado" : "Editar valor do mês"}
                  >
                    <span className="w-28 text-right text-xs font-medium">{v !== null ? formatBRL(v) : "—"}</span>
                    {!isDealerManager && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                  </button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico anual</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">Ano</th>
                  <th className="px-2 py-2 text-right">Meta</th>
                  <th className="px-2 py-2 text-right">Realizado</th>
                  <th className="px-2 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {(anuais ?? []).map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">{m.ano}</td>
                    <td className="px-2 py-2 text-right">{formatBRL(Number(m.meta))}</td>
                    <td className="px-2 py-2 text-right">{formatBRL(annualRealized(m, mensais ?? [], ANO))}</td>
                    <td className="px-2 py-2 text-right">
                      <Badge variant="secondary">{formatPct(m.meta, annualRealized(m, mensais ?? [], ANO))}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" /> Reservas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(reservas ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma reserva registrada para esta revenda.</p>
            )}
            {(reservas ?? []).slice(0, 10).map((r) => {
              const efetivo = reservaStatusEfetivo(r.status, r.validade);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      Grupo {r.grupo} · Cota {r.cota}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.vendedor ?? "Sem vendedor"} · Validade {r.validade.split("-").reverse().join("/")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[efetivo]}`}>
                    {STATUS_LABEL[efetivo]}
                  </span>
                </div>
              );
            })}
            {(reservas ?? []).length > 10 && (
              <p className="text-xs text-muted-foreground">Mostrando as 10 primeiras de {(reservas ?? []).length} reservas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Visitas e eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(eventos ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento cadastrado para esta revenda.</p>
          )}
          {(eventos ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{e.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.cidade, e.estado].filter(Boolean).join(" - ") || "—"}
                  {e.logistica ? ` · ${e.logistica}` : ""}
                </p>
              </div>
              <span className="text-xs font-medium">{e.data.split("-").reverse().join("/")}</span>
            </div>
          ))}
          {!isDealerManager && <Link to="/mauricio/calendario" className="block text-sm font-medium text-primary hover:underline">
            Abrir calendário completo →
          </Link>}
        </CardContent>
      </Card>
    </div>
  );
}
