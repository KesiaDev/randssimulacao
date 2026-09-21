import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [sims, profiles, groups] = await Promise.all([
        supabase.from("simulations").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, name, email, active"),
        supabase.from("groups").select("id, active"),
      ]);
      if (sims.error || profiles.error || groups.error)
        throw sims.error ?? profiles.error ?? groups.error;
      return { sims: sims.data ?? [], profiles: profiles.data ?? [], groups: groups.data ?? [] };
    },
  });

  const sims = data?.sims ?? [];
  const profiles = data?.profiles ?? [];
  const nameById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p.name || p.email])),
    [profiles],
  );

  const today = new Date().toDateString();
  const month = new Date().getMonth();

  const bySeller = Object.entries(
    sims.reduce<Record<string, number>>((acc, s) => {
      const k = nameById[s.seller_id] ?? "—";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, total]) => ({ name, total }));

  const byCredit = Object.entries(
    sims.reduce<Record<string, number>>((acc, s) => {
      const k = formatBRL(Number(s.credit_value));
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, total]) => ({ name, total }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Administração</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da operação comercial · Randon Consórcios
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Vendedores" value={profiles.length} />
        <Stat label="Vendedores ativos" value={profiles.filter((p) => p.active).length} />
        <Stat
          label="Simulações hoje"
          value={sims.filter((s) => new Date(s.created_at).toDateString() === today).length}
        />
        <Stat
          label="Simulações no mês"
          value={sims.filter((s) => new Date(s.created_at).getMonth() === month).length}
        />
        <Stat label="Grupos ativos" value={(data?.groups ?? []).filter((g) => g.active).length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="Simulações por vendedor" data={bySeller} />
        <Chart title="Simulações por faixa de crédito" data={byCredit} />
      </div>

      <section className="surface overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Últimas simulações</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                  <td className="px-5 py-3 text-muted-foreground">{formatDateTime(s.created_at)}</td>
                  <td className="px-5 py-3">{nameById[s.seller_id] ?? "—"}</td>
                  <td className="px-5 py-3">{s.group_code}</td>
                  <td className="px-5 py-3 tabular">{formatBRL(Number(s.credit_value))}</td>
                  <td className="px-5 py-3 font-medium tabular">
                    {formatBRL(Number(s.final_amount))}
                  </td>
                </tr>
              ))}
              {sims.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
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
    <div className="surface p-5">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
    </div>
  );
}

function Chart({ title, data }: { title: string; data: Array<{ name: string; total: number }> }) {
  return (
    <div className="surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 h-64">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={8} />
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
