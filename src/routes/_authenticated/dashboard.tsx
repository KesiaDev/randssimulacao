import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Plus, ShoppingCart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateTime, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do vendedor — Randon Consórcios" },
      { name: "description", content: "Acompanhe suas simulações e crie novas propostas." },
      { property: "og:title", content: "Painel do vendedor — Randon Consórcios" },
      {
        property: "og:description",
        content: "Acompanhe suas simulações e crie novas propostas.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, user, isAdmin } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-simulations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const { data: proposals } = useQuery({
    queryKey: ["my-proposals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("proposals")
        .select("id, client_name, created_at, proposal_items(quantity, credit_value, final_amount)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  const today = new Date().toDateString();
  const month = new Date().getMonth();
  const todayCount = rows.filter((r) => new Date(r.created_at).toDateString() === today).length;
  const monthCount = rows.filter((r) => new Date(r.created_at).getMonth() === month).length;
  const last = rows[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold sm:text-3xl">Olá, {profile?.name || "vendedor"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? "Acesso administrativo" : "Equipe comercial"} · Randon Consórcios
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/simular" search={{ edit: undefined, legacy: undefined }}>
            <Plus className="mr-1 h-4 w-4" /> Nova proposta
          </Link>
        </Button>
      </div>

      {(proposals ?? []).length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Propostas recentes</h2>
            <Link to="/historico" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(proposals ?? []).map((proposal) => {
              const quantity = proposal.proposal_items.reduce((sum, item) => sum + item.quantity, 0);
              const credit = proposal.proposal_items.reduce((sum, item) => sum + Number(item.credit_value) * item.quantity, 0);
              const monthly = proposal.proposal_items.reduce((sum, item) => sum + Number(item.final_amount) * item.quantity, 0);
              return (
                <Link key={proposal.id} to="/proposta/$id" params={{ id: proposal.id }} className="surface block p-4 transition-colors hover:border-primary/40 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="truncate font-semibold">{proposal.client_name || "Cliente Randon"}</div><div className="mt-1 text-xs text-muted-foreground">{formatDateTime(proposal.created_at)}</div></div>
                    <ShoppingCart className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Cotas</div><div className="font-medium tabular">{quantity}</div></div>
                    <div><div className="text-xs text-muted-foreground">Crédito</div><div className="break-words font-medium tabular">{formatBRL(credit)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Parcela/mês</div><div className="break-words font-medium tabular">{formatBRL(monthly)}</div></div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Simulações hoje" value={String(todayCount)} icon={CalendarDays} />
        <StatCard label="Simulações este mês" value={String(monthCount)} icon={TrendingUp} />
        <StatCard
          label="Última simulação"
          value={last ? formatBRL(Number(last.final_amount)) : "—"}
          hint={last ? formatDateTime(last.created_at) : "Nenhuma ainda"}
          icon={ArrowUpRight}
        />
      </div>

      <section className="sm:surface overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Simulações recentes</h2>
          <Link to="/historico" className="text-xs text-primary hover:underline">
            Ver histórico
          </Link>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Você ainda não possui simulações. Crie a primeira em poucos cliques.
          </p>
        ) : (
          <div className="sm:overflow-x-auto">
            <table className="mobile-card-table w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Grupo</th>
                  <th className="px-5 py-3">Crédito</th>
                  <th className="px-5 py-3">Taxa</th>
                  <th className="px-5 py-3">Parcela</th>
                  <th className="px-5 py-3">Seguro</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-t border-border/70">
                    <td data-label="Data" className="px-5 py-3 text-muted-foreground">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td data-label="Cliente" className="px-5 py-3">{r.client_name || "—"}</td>
                    <td data-label="Grupo" className="px-5 py-3">{r.group_code}</td>
                    <td data-label="Crédito" className="px-5 py-3 tabular">{formatBRL(Number(r.credit_value))}</td>
                    <td data-label="Taxa" className="px-5 py-3 tabular">
                      {formatPercent(Number(r.administration_rate))}
                    </td>
                    <td data-label="Parcela" className="px-5 py-3 font-medium tabular">
                      {formatBRL(Number(r.final_amount))}
                    </td>
                    <td data-label="Seguro" className="px-5 py-3">{r.insurance_included ? "Incluído" : "Não"}</td>
                    <td data-label="Ação" className="px-5 py-3 text-right">
                      <Link
                        to="/proposta/$id"
                        params={{ id: r.id }}
                        className="text-xs text-primary hover:underline"
                      >
                        Proposta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
