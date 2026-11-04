import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

interface UsageRow {
  id: string;
  name: string;
  dealer: string | null;
  accesses: number;
  active_days: number;
  simulations: number;
  proposals: number;
  last_access_at: string | null;
  period_days: number;
}

const PERIODS = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
];

function spDate(offsetDays: number) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function rating(r: UsageRow) {
  if (r.accesses === 0 && r.simulations === 0) return { label: "Sem uso", cls: "text-destructive" };
  const perDay = r.simulations / Math.max(r.active_days, 1);
  if (perDay >= 3) return { label: "Bom uso", cls: "text-primary" };
  if (perDay >= 1) return { label: "Uso regular", cls: "text-foreground" };
  return { label: "Pouco uso", cls: "text-muted-foreground" };
}

export function SellerUsage() {
  const [period, setPeriod] = useState("7");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    const days = Number(period);
    setRange({ from: spDate(days - 1), to: spDate(0) });
  }, [period]);

  const { data, isPending, isError } = useQuery({
    queryKey: ["seller-usage", range?.from, range?.to],
    enabled: !!range,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_seller_usage", { _from: range!.from, _to: range!.to });
      if (error) throw error;
      return (data ?? []) as unknown as UsageRow[];
    },
  });

  return (
    <section className="sm:surface overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Uso da plataforma por vendedor</h2>
          <p className="text-xs text-muted-foreground">Acessos por dia × simulações feitas no período.</p>
        </div>
        <div className="w-44">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger aria-label="Período de uso"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </header>
      {isPending && <p className="px-5 py-6 text-sm text-muted-foreground">Carregando…</p>}
      {isError && <p className="px-5 py-6 text-sm text-destructive">Não foi possível carregar o uso dos vendedores.</p>}
      {data && (
        <div className="max-h-[560px] sm:overflow-auto">
          <table className="mobile-card-table w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Vendedor</th>
                <th className="px-5 py-3">Acessos</th>
                <th className="px-5 py-3">Acessos/dia</th>
                <th className="px-5 py-3">Dias ativos</th>
                <th className="px-5 py-3">Simulações</th>
                <th className="px-5 py-3">Simulações/dia</th>
                <th className="px-5 py-3">Último acesso</th>
                <th className="px-5 py-3">Avaliação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const rate = rating(r);
                const days = Math.max(r.active_days, 1);
                return (
                  <tr key={r.id} className="border-t border-border/70">
                    <td data-label="Vendedor" className="px-5 py-3"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.dealer ?? "—"}</div></td>
                    <td data-label="Acessos" className="px-5 py-3 tabular">{r.accesses}</td>
                    <td data-label="Acessos/dia" className="px-5 py-3 tabular">{r.active_days ? (r.accesses / days).toFixed(1).replace(".", ",") : "—"}</td>
                    <td data-label="Dias ativos" className="px-5 py-3 tabular">{r.active_days} de {r.period_days}</td>
                    <td data-label="Simulações" className="px-5 py-3 tabular">{r.simulations}</td>
                    <td data-label="Simulações/dia" className="px-5 py-3 tabular">{r.simulations ? (r.simulations / days).toFixed(1).replace(".", ",") : "—"}</td>
                    <td data-label="Último acesso" className="px-5 py-3 text-muted-foreground">{r.last_access_at ? formatDateTime(r.last_access_at) : "—"}</td>
                    <td data-label="Avaliação" className={`px-5 py-3 font-medium ${rate.cls}`}>{rate.label}</td>
                  </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan={8} className="mobile-empty px-5 py-10 text-center text-muted-foreground">Nenhum vendedor.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
