import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatBRL, formatPct, MESES, REVENDAS } from "@/lib/mauricio";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mauricio/metas")({
  head: () => ({ meta: [
    { title: "Metas e Resultados por Revenda — Randon" },
    { name: "description", content: "Resultados mensais e histórico anual de metas comerciais por revenda Randon." },
    { property: "og:title", content: "Metas e Resultados — Randon" },
    { property: "og:description", content: "Acompanhamento de metas e resultados comerciais por revenda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MetasPage,
});

const ANO = 2026;

function MetasPage() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");

  const { data: mensais } = useQuery({
    queryKey: ["m-mensais", ANO],
    queryFn: async () =>
      (await supabase.from("mauricio_resultados_mensais").select("*").eq("ano", ANO)).data ?? [],
  });
  const { data: anuais } = useQuery({
    queryKey: ["m-metas-hist"],
    queryFn: async () =>
      (await supabase.from("mauricio_metas_anuais").select("*").order("revenda").order("ano")).data ?? [],
  });

  function valorMes(revenda: string, mes: number): number | null {
    const row = (mensais ?? []).find((m) => m.revenda === revenda && m.mes === mes);
    return row ? Number(row.valor) : null;
  }

  function totalMes(mes: number): number | null {
    const vals = REVENDAS.map((r) => valorMes(r, mes)).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
  }

  async function salvarMensal(revenda: string, mes: number) {
    const num = valorEdicao.trim() === "" ? null : Number(valorEdicao.replace(",", "."));
    if (num !== null && Number.isNaN(num)) {
      toast.error("Valor inválido");
      return;
    }
    const { error } = await supabase
      .from("mauricio_resultados_mensais")
      .upsert({ ano: ANO, mes, revenda, valor: num }, { onConflict: "ano,mes,revenda" });
    if (error) toast.error(error.message);
    else {
      toast.success("Valor atualizado");
      setEditando(null);
      void qc.invalidateQueries({ queryKey: ["m-mensais"] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metas e Resultados</h1>
        <p className="text-sm text-muted-foreground">
          Valores importados da planilha. Clique no lápis para atualizar um mês.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado mensal por revenda — {ANO}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Revenda</th>
                {MESES.map((m) => (
                  <th key={m} className="px-2 py-2 text-right">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REVENDAS.map((rev) => (
                <tr key={rev} className="border-b">
                  <td className="py-2 pr-4 font-medium">{rev}</td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const v = valorMes(rev, mes);
                    const key = `${rev}-${mes}`;
                    return (
                      <td key={mes} className="px-2 py-2 text-right">
                        {editando === key ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-24 text-right text-xs"
                              value={valorEdicao}
                              onChange={(e) => setValorEdicao(e.target.value)}
                              autoFocus
                            />
                            <Button size="sm" className="h-7 px-2" onClick={() => void salvarMensal(rev, mes)}>
                              OK
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="group inline-flex items-center gap-1"
                            onClick={() => {
                              setEditando(key);
                              setValorEdicao(v !== null ? String(v) : "");
                            }}
                            title="Editar valor do mês"
                          >
                            <span>{v !== null ? formatBRL(v) : "—"}</span>
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-4">TOTAL</td>
                {MESES.map((_, i) => {
                  const t = totalMes(i + 1);
                  return (
                    <td key={i} className="px-2 py-2 text-right">
                      {t !== null ? formatBRL(t) : "—"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            "—" significa mês sem dado informado na planilha (não é zero).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico anual por revenda</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Revenda</th>
                <th className="px-2 py-2">Ano</th>
                <th className="px-2 py-2 text-right">Meta</th>
                <th className="px-2 py-2 text-right">Realizado</th>
                <th className="px-2 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {(anuais ?? []).map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{m.revenda}</td>
                  <td className="px-2 py-2">{m.ano}</td>
                  <td className="px-2 py-2 text-right">{formatBRL(Number(m.meta))}</td>
                  <td className="px-2 py-2 text-right">{formatBRL(m.realizado !== null ? Number(m.realizado) : null)}</td>
                  <td className="px-2 py-2 text-right">
                    <Badge variant="secondary">{formatPct(Number(m.meta), m.realizado !== null ? Number(m.realizado) : null)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
