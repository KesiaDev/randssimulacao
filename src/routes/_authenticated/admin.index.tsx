import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data: overview, error } = await supabase.rpc("get_admin_overview", {
        _top_sellers: 20,
      });
      if (error) throw error;
      return overview as unknown as AdminOverview;
    },
  });

  const sims = data?.ultimas ?? [];
  const bySeller = data?.por_vendedor ?? [];
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Stat label="Vendedores" value={Number(data?.total_vendedores ?? 0)} />
        <Stat label="Vendedores ativos" value={Number(data?.vendedores_ativos ?? 0)} />
        <Stat label="Simulações hoje" value={Number(data?.simulacoes_hoje ?? 0)} />
        <Stat label="Simulações no mês" value={Number(data?.simulacoes_mes ?? 0)} />
        <Stat label="Grupos ativos" value={Number(data?.grupos_ativos ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="Simulações por vendedor" data={bySeller} />
        <Chart title="Simulações por faixa de crédito" data={byCredit} />
      </div>

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface min-w-0 p-4 sm:p-5">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
    </div>
  );
}

function Chart({ title, data }: { title: string; data: Array<{ name: string; total: number }> }) {
  return (
    <div className="surface min-w-0 overflow-hidden p-4 sm:p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 h-64 min-w-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -24, right: 4, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" angle={-12} dy={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
