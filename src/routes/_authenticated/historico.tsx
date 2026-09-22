import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useConfig";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatDateTime, formatPercent } from "@/lib/format";
import { Eye, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const queryClient = useQueryClient();
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

  const { data: proposals } = useQuery({
    queryKey: ["proposals-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, seller_id, client_name, created_at, proposal_items(quantity, credit_value, final_amount, simulation_id)")
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

  const linkedSimulationIds = useMemo(() => new Set((proposals ?? []).flatMap((proposal) => proposal.proposal_items.flatMap((item) => item.simulation_id ? [item.simulation_id] : []))), [proposals]);
  const rows = (sims ?? []).filter((r) => {
    if (linkedSimulationIds.has(r.id)) return false;
    if (group && r.group_code !== group) return false;
    if (seller && !(nameById[r.seller_id] ?? "").toLowerCase().includes(seller.toLowerCase()))
      return false;
    if (date && !r.created_at.startsWith(date)) return false;
    if (credit && !String(Number(r.credit_value)).includes(credit.replace(/\D/g, ""))) return false;
    return true;
  });

  async function deleteProposal(id: string) {
    const { error } = await supabase.rpc("delete_saved_proposal", { _proposal_id: id });
    if (error) { toast.error("Não foi possível excluir a proposta."); return; }
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["proposals-all"] }), queryClient.invalidateQueries({ queryKey: ["simulations-all"] }), queryClient.invalidateQueries({ queryKey: ["my-proposals"] }), queryClient.invalidateQueries({ queryKey: ["my-simulations"] })]);
    toast.success("Proposta excluída.");
  }

  async function deleteLegacySimulation(id: string) {
    const { error } = await supabase.rpc("delete_legacy_simulation", { _simulation_id: id });
    if (error) { toast.error("Não foi possível excluir a simulação."); return; }
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["simulations-all"] }), queryClient.invalidateQueries({ queryKey: ["my-simulations"] })]);
    toast.success("Simulação excluída.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Histórico de simulações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? "Todas as simulações da equipe." : "Suas simulações."}
        </p>
      </div>

      {(proposals ?? []).length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary"/><h2 className="text-sm font-semibold">Propostas compostas</h2></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(proposals ?? []).filter((proposal) => {
              if (seller && !(nameById[proposal.seller_id] ?? "").toLowerCase().includes(seller.toLowerCase())) return false;
              if (date && !proposal.created_at.startsWith(date)) return false;
              return true;
            }).map((proposal) => {
              const quantity = proposal.proposal_items.reduce((sum, item) => sum + item.quantity, 0);
              const creditTotal = proposal.proposal_items.reduce((sum, item) => sum + Number(item.credit_value) * item.quantity, 0);
              const monthlyTotal = proposal.proposal_items.reduce((sum, item) => sum + Number(item.final_amount) * item.quantity, 0);
              return <article key={proposal.id} className="surface p-4 transition-colors hover:border-primary/40 sm:p-5"><div className="flex justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold">{proposal.client_name || "Cliente Randon"}</div><div className="mt-1 text-xs text-muted-foreground">{formatDateTime(proposal.created_at)} · {nameById[proposal.seller_id] ?? "—"}</div></div><div className="shrink-0 text-sm font-semibold text-primary">{quantity} {quantity === 1 ? "cota" : "cotas"}</div></div><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><div className="text-xs text-muted-foreground">Crédito total</div><div className="font-medium tabular">{formatBRL(creditTotal)}</div></div><div><div className="text-xs text-muted-foreground">Parcela total/mês</div><div className="font-medium tabular">{formatBRL(monthlyTotal)}</div></div></div><div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3"><Button variant="outline" size="sm" asChild><Link to="/proposta/$id" params={{ id: proposal.id }}><Eye/> Abrir</Link></Button><Button variant="outline" size="sm" asChild><Link to="/simular" search={{ edit: proposal.id, legacy: undefined }}><Pencil/> Editar</Link></Button><DeleteConfirm title="Excluir esta proposta?" description="A proposta, seus itens e as simulações vinculadas serão removidos definitivamente." onConfirm={() => void deleteProposal(proposal.id)}/></div></article>;
            })}
          </div>
        </section>
      )}

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
                  <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" asChild><Link to="/proposta/$id" params={{ id: r.id }} aria-label="Abrir simulação"><Eye/></Link></Button><Button variant="ghost" size="icon" asChild><Link to="/simular" search={{ edit: undefined, legacy: r.id }} aria-label="Editar simulação"><Pencil/></Link></Button><DeleteConfirm iconOnly title="Excluir esta simulação?" description="Esta simulação antiga será removida definitivamente." onConfirm={() => void deleteLegacySimulation(r.id)}/></div>
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

function DeleteConfirm({ title, description, onConfirm, iconOnly = false }: { title: string; description: string; onConfirm: () => void; iconOnly?: boolean }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size={iconOnly ? "icon" : "sm"} aria-label="Excluir"><Trash2/>{!iconOnly && " Excluir"}</Button></AlertDialogTrigger><AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg"><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
