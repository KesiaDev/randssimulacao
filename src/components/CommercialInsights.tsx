import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { commercialInsight } from "@/lib/commercial-insights";
import { formatBRL, formatPct, MESES } from "@/lib/mauricio";
import { ChartNoAxesCombined, TrendingUp } from "lucide-react";

const percent = (value: number | null) => value === null ? "Sem base comparável" : `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function CommercialInsights({ currentYear }: { currentYear: number }) {
  const [year, setYear] = useState(currentYear);
  const [cutoff, setCutoff] = useState(9);
  const [dealer, setDealer] = useState("all");
  const [scenario, setScenario] = useState("base");
  const annualQuery = useQuery({
    queryKey: ["m-strategy-annual", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("mauricio_metas_anuais").select("ano,revenda,meta,realizado").gte("ano", currentYear - 3).lte("ano", currentYear).order("ano");
      if (error) throw error;
      return data;
    },
  });
  const monthlyQuery = useQuery({
    queryKey: ["m-strategy-monthly", year],
    queryFn: async () => {
      const { data, error } = await supabase.from("mauricio_resultados_mensais").select("ano,mes,revenda,valor").gte("ano", year - 1).lte("ano", year);
      if (error) throw error;
      return data;
    },
  });
  const annual = annualQuery.data ?? [];
  const monthly = monthlyQuery.data ?? [];
  const years = [...new Set([currentYear, ...annual.map(r => r.ano)])].sort((a, b) => b - a);
  const dealers = [...new Set(annual.map(r => r.revenda))].sort();
  const selected = annual.filter(r => r.ano === year && (dealer === "all" || r.revenda === dealer));
  const history = annual.filter(r => dealer === "all" || r.revenda === dealer);

  return <section className="space-y-5 border-t pt-6" aria-labelledby="strategic-title">
    <div className="space-y-1">
      <h2 id="strategic-title" className="flex items-center gap-2 text-xl font-bold"><ChartNoAxesCombined className="h-5 w-5 text-primary" /> Perspectiva estratégica</h2>
      <p className="text-sm text-muted-foreground">Evolução, ritmo comercial e oportunidades para alcançar a meta.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1"><span className="text-xs font-medium">Ano de análise</span><Select value={String(year)} onValueChange={v => setYear(Number(v))}><SelectTrigger aria-label="Ano de análise"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><span className="text-xs font-medium">Resultados até</span><Select value={String(cutoff)} onValueChange={v => setCutoff(Number(v))}><SelectTrigger aria-label="Resultados até"><SelectValue /></SelectTrigger><SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><span className="text-xs font-medium">Revenda</span><Select value={dealer} onValueChange={setDealer}><SelectTrigger aria-label="Revenda da análise"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as revendas</SelectItem>{dealers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><span className="text-xs font-medium">Cenário de ritmo futuro</span><Select value={scenario} onValueChange={setScenario}><SelectTrigger aria-label="Cenário de ritmo futuro"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cautious">Cauteloso · −10%</SelectItem><SelectItem value="base">Manter ritmo recente</SelectItem><SelectItem value="growth">Expansão · +10%</SelectItem></SelectContent></Select></div>
    </div>
    <p className="text-xs text-muted-foreground">Projeção ilustrativa: acumulado de janeiro ao mês escolhido + média dos últimos três meses desse período × meses restantes. Os cenários alteram apenas o ritmo futuro em 10%; não incluem sazonalidade ou reajustes. Mês ausente impede a projeção; zero registrado é preservado.</p>
    {annualQuery.isPending || monthlyQuery.isPending ? <p className="text-sm text-muted-foreground" role="status">Carregando indicadores…</p> : annualQuery.isError || monthlyQuery.isError ? <p className="text-sm text-destructive" role="alert">Não foi possível carregar os indicadores. Tente novamente ao abrir esta página.</p> : <>
      {selected.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resultado anual registrado para esta seleção.</p>}
      <div className="grid gap-4 xl:grid-cols-3">
        {selected.map(a => {
          const insight = commercialInsight(a, monthly, cutoff);
          const projection = scenario === "cautious" ? insight.cautious : scenario === "growth" ? insight.growth : insight.projection;
          const gap = a.meta !== null && projection !== null ? Math.max(0, a.meta - projection) : null;
          const increase = insight.required !== null && insight.pace !== null && insight.pace > 0 ? Math.max(0, (insight.required / insight.pace - 1) * 100) : null;
          return <article key={a.revenda} className="min-w-0 space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{a.revenda}</h3><Badge variant="secondary">{insight.recorded}/{cutoff} meses</Badge></div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted-foreground">{MESES[cutoff - 1]} vs. {cutoff > 1 ? MESES[cutoff - 2] : "mês anterior indisponível"}</dt><dd className="font-semibold">{percent(insight.monthChange)}</dd><dd className="text-xs text-muted-foreground">{formatBRL(insight.monthCurrent)} / {formatBRL(insight.monthPrevious)}</dd></div>
              <div><dt className="text-muted-foreground">Mesmos meses de {year - 1}</dt><dd className="font-semibold">{percent(insight.yearChange)}</dd><dd className="text-xs text-muted-foreground">{insight.pairedMonths} de {cutoff} meses comparáveis{insight.pairedMonths < cutoff && insight.pairedMonths > 0 ? " · comparação parcial" : ""}</dd></div>
              <div className="border-t pt-3"><dt className="text-muted-foreground">Projeção de fechamento · {year}</dt><dd className="break-words text-xl font-bold text-primary">{formatBRL(projection)}</dd><dd className="text-xs text-muted-foreground">{projection === null ? "Dados mensais incompletos; sem estimativa." : `Cumprimento projetado: ${formatPct(a.meta, projection)}`}</dd></div>
              <div><dt className="text-muted-foreground">Ritmo recente por mês</dt><dd className="font-semibold">{formatBRL(insight.pace)}</dd></div>
              <div><dt className="text-muted-foreground">Necessário por mês para atingir a meta</dt><dd className="font-semibold">{formatBRL(insight.required)}</dd><dd className="text-xs text-muted-foreground">{insight.remaining > 0 ? `${insight.remaining} meses restantes após ${MESES[cutoff - 1]}` : "Ano encerrado no período selecionado"}</dd></div>
            </dl>
            <div className="space-y-2 border-t pt-3 text-sm"><h4 className="flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Argumento de melhoria</h4>
              {!insight.complete ? <p>Completar os {cutoff - insight.recorded} meses sem informação antes de definir uma previsão ou comparar o ritmo com a meta.</p> : gap !== null && gap > 0 ? <p>O cenário deixa {formatBRL(gap)} abaixo da meta.{increase !== null && increase > 0 ? ` Para atingir a meta, o ritmo precisa subir ${increase.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre a média recente.` : ""} Priorizar retorno às propostas abertas e visitas com maior potencial.</p> : projection !== null && a.meta !== null ? <p>O cenário alcança a meta. Sustentar o acompanhamento das propostas e replicar as práticas das revendas com melhor evolução.</p> : <p>Registrar a meta anual para avaliar o esforço comercial necessário.</p>}
              {insight.monthChange !== null && insight.monthChange < 0 && <p className="text-muted-foreground">Queda no último mês: investigar propostas paradas, retorno de clientes e agenda de visitas antes de atribuir uma causa.</p>}
            </div>
          </article>;
        })}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">Comparação de anos · histórico preservado</h3>
        <p className="text-xs text-muted-foreground">Valores anuais conforme registrados na planilha. {currentYear} pode estar parcial; não representa comparação de anos completos. Totais anuais não substituem os dados mensais das projeções.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="py-2">Revenda / ano</th><th className="px-3 text-right">Meta anual</th><th className="px-3 text-right">Realizado registrado</th><th className="text-right">Cumprimento</th></tr></thead><tbody>{history.map(a => <tr key={`${a.revenda}-${a.ano}`} className="border-b"><td className="py-3 font-medium">{a.revenda} · {a.ano}{a.ano === currentYear && <span className="ml-2 text-xs text-muted-foreground">parcial / a conferir</span>}</td><td className="px-3 text-right">{formatBRL(a.meta)}</td><td className="px-3 text-right">{formatBRL(a.realizado)}</td><td className="text-right">{formatPct(a.meta, a.realizado)}</td></tr>)}</tbody></table></div>
      </div>
    </>}
  </section>;
}