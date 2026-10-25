import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MESES } from "@/lib/mauricio";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Administração — Randon Consórcios" },
      { name: "description", content: "Visão geral da equipe, grupos e simulações." },
      { property: "og:title", content: "Administração — Randon Consórcios" },
      { property: "og:description", content: "Visão geral da equipe, grupos e simulações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHome,
});

interface AdminOverview {
  ano: number;
  propostas_ano: number;
  ticket_medio: number | null;
  credito_proposto: number | null;
  credito_proposto_mes: number | null;
  propostas_mensais: Array<{ mes: number; total: number; ticket_medio: number | null }>;
  volume_vendedores: Array<{ name: string; total: number }>;
  total_vendedores: number;
  vendedores_ativos: number;
  grupos_ativos: number;
  simulacoes_hoje: number;
  simulacoes_mes: number;
  por_vendedor: Array<{ name: string; total: number }>;
  por_credito: Array<{ credit_value: number; total: number }>;
  ultimas: Array<{
    id: string;
    created_at: string;
    seller_name: string;
    group_code: string;
    credit_value: number;
    final_amount: number;
  }>;
}

function AdminHome() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [year, setYear] = useState(2026);
  const [monthLabel, setMonthLabel] = useState("");
  useEffect(() => {
    const nowYear = Number(new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()));
    setCurrentYear(nowYear);
    setYear(nowYear);
    const month = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long" }).format(new Date());
    setMonthLabel(month.charAt(0).toUpperCase() + month.slice(1));
  }, []);
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-overview", year],
    queryFn: async () => {
      const { data: overview, error } = await supabase.rpc("get_admin_dashboard", {
        _year: year,
        _top_sellers: 20,
      });
      if (error) throw error;
      return overview as unknown as AdminOverview;
    },
  });

  const sims = data?.ultimas ?? [];
  const bySeller = data?.volume_vendedores ?? [];
  const byMonth = (data?.propostas_mensais ?? []).map(item => ({ name: MESES[item.mes - 1] ?? "", total: Number(item.total) }));
  const byCredit = (data?.por_credito ?? []).map((item) => ({
    name: formatBRL(Number(item.credit_value)),
    total: Number(item.total),
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Administração</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da operação comercial · Randon Consórcios
        </p>
      </div>

      {isPending && <p role="status" className="text-sm text-muted-foreground">Carregando indicadores…</p>}
      {isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os indicadores da Administração.</p>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Stat label="Vendedores" value={Number(data?.total_vendedores ?? 0)} />
        <Stat label="Vendedores ativos" value={Number(data?.vendedores_ativos ?? 0)} />
        <Stat label="Simulações hoje" value={Number(data?.simulacoes_hoje ?? 0)} />
        <Stat label="Simulações no mês" value={Number(data?.simulacoes_mes ?? 0)} />
        <Stat label="Grupos ativos" value={Number(data?.grupos_ativos ?? 0)} />
      </div>

      <section className="space-y-4 border-y border-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Produção comercial · {year}</h2>
          <div className="w-32"><Select value={String(year)} onValueChange={value => setYear(Number(value))}><SelectTrigger aria-label="Ano dos indicadores"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Propostas no ano" value={data ? Number(data.propostas_ano) : "—"} />
          <Stat label="Ticket médio · crédito por proposta" value={data?.ticket_medio == null ? "—" : formatBRL(Number(data.ticket_medio))} />
          <Stat label={monthLabel ? `Total proposto no mês · ${monthLabel}` : "Total proposto no mês"} value={data?.credito_proposto_mes == null ? "—" : formatBRL(Number(data.credito_proposto_mes))} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart title={`Propostas por mês · ${year}`} data={byMonth} />
          <Chart title={`Volume de simulações por vendedor · ${year}`} data={bySeller} horizontal />
        </div>
      </section>
      <Chart title="Simulações por faixa de crédito · mês atual" data={byCredit} />

      <section className="sm:surface overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Últimas simulações</h2>
        </header>
        <div className="sm:overflow-x-auto">
          <table className="mobile-card-table w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Vendedor</th>
                <th className="px-5 py-3">Grupo</th>
                <th className="px-5 py-3">Crédito</th>
                <th className="px-5 py-3">Parcela final</th>
              </tr>
            </thead>
            <tbody>
              {sims.slice(0, 10).map((s) => (
                <tr key={s.id} className="border-t border-border/70">
                  <td data-label="Data" className="px-5 py-3 text-muted-foreground">{formatDateTime(s.created_at)}</td>
                  <td data-label="Vendedor" className="px-5 py-3">{s.seller_name}</td>
                  <td data-label="Grupo" className="px-5 py-3">{s.group_code}</td>
                  <td data-label="Crédito" className="px-5 py-3 tabular">{formatBRL(Number(s.credit_value))}</td>
                  <td data-label="Parcela final" className="px-5 py-3 font-medium tabular">
                    {formatBRL(Number(s.final_amount))}
                  </td>
                </tr>
              ))}
              {sims.length === 0 && (
                <tr>
                  <td colSpan={5} className="mobile-empty px-5 py-10 text-center text-muted-foreground">
                    Nenhuma simulação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface min-w-0 p-4 sm:p-5">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-xl font-semibold tabular sm:text-2xl">{value}</div>
    </div>
  );
}

function Chart({ title, data, horizontal = false }: { title: string; data: Array<{ name: string; total: number }>; horizontal?: boolean }) {
  return (
    <div className="surface min-w-0 overflow-hidden p-4 sm:p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className={`mt-4 min-w-0 ${horizontal ? "h-[640px]" : "h-64"}`}>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 0 : -24, right: 16, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis type={horizontal ? "number" : "category"} {...(horizontal ? {} : { dataKey: "name" })} allowDecimals={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis type={horizontal ? "category" : "number"} {...(horizontal ? { dataKey: "name" } : {})} width={horizontal ? 130 : 60} allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [value, "Quantidade"]} />
              <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
