import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useConfig";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatDateTime, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de simulações — Randon Consórcios" },
      { name: "description", content: "Busque e filtre simulações realizadas pela equipe." },
      { property: "og:title", content: "Histórico de simulações — Randon Consórcios" },
      {
        property: "og:description",
        content: "Busque e filtre simulações realizadas pela equipe.",
      },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { isAdmin } = useAuth();
  const { data: groups } = useGroups(false);
  const [group, setGroup] = useState("");
  const [seller, setSeller] = useState("");
  const [date, setDate] = useState("");
  const [credit, setCredit] = useState("");

  const { data: sims } = useQuery({
    queryKey: ["simulations-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, email");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameById = useMemo(
    () => Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name || p.email])),
    [profiles],
  );

  const rows = (sims ?? []).filter((r) => {
    if (group && r.group_code !== group) return false;
    if (seller && !(nameById[r.seller_id] ?? "").toLowerCase().includes(seller.toLowerCase()))
      return false;
    if (date && !r.created_at.startsWith(date)) return false;
    if (credit && !String(Number(r.credit_value)).includes(credit.replace(/\D/g, ""))) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Histórico de simulações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? "Todas as simulações da equipe." : "Suas simulações."}
        </p>
      </div>

      <div className="surface grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Grupo</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">Todos</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Vendedor</Label>
          <Input
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            placeholder="Nome do vendedor"
          />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Faixa de crédito</Label>
          <Input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="293305" />
        </div>
      </div>

      <div className="sm:surface sm:overflow-x-auto">
        <table className="mobile-card-table w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Vendedor</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Grupo</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Taxa</th>
              <th className="px-5 py-3">Modalidade</th>
              <th className="px-5 py-3">Seguro</th>
              <th className="px-5 py-3">Parcela final</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/70">
                <td data-label="Data" className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </td>
                <td data-label="Vendedor" className="px-5 py-3">{nameById[r.seller_id] ?? "—"}</td>
                <td data-label="Cliente" className="px-5 py-3">{r.client_name || "—"}</td>
                <td data-label="Grupo" className="px-5 py-3">{r.group_code}</td>
                <td data-label="Crédito" className="px-5 py-3 tabular">{formatBRL(Number(r.credit_value))}</td>
                <td data-label="Taxa" className="px-5 py-3 tabular">
                  {formatPercent(Number(r.administration_rate))}
                </td>
                <td data-label="Modalidade" className="px-5 py-3">{r.installment_type_name}</td>
                <td data-label="Seguro" className="px-5 py-3">{r.insurance_included ? "Incluído" : "Não"}</td>
                <td data-label="Parcela final" className="px-5 py-3 font-medium tabular">
                  {formatBRL(Number(r.final_amount))}
                </td>
                <td data-label="Ação" className="px-5 py-3 text-right whitespace-nowrap">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="mobile-empty px-5 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma simulação encontrada com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
