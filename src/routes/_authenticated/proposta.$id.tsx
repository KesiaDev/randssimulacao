import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateProposalTotals } from "@/lib/proposal-calc";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import graneleiro from "@/assets/graneleiro.jpg.asset.json";
import frigorifico from "@/assets/frigorifico.jpg.asset.json";
import furgao from "@/assets/furgao.jpg.asset.json";
import sider from "@/assets/sider.jpg.asset.json";
import type { Database } from "@/integrations/supabase/types";

const proposalImages = [graneleiro, frigorifico, furgao, sider];
type ItemRow = Database["public"]["Tables"]["proposal_items"]["Row"];
type ProposalRow = Database["public"]["Tables"]["proposals"]["Row"];
type SimulationRow = Database["public"]["Tables"]["simulations"]["Row"];

export const Route = createFileRoute("/_authenticated/proposta/$id")({
  head: () => ({ meta: [
    { title: "Proposta comercial — Randon Consórcios" },
    { name: "description", content: "Proposta comercial personalizada de consórcio Randon." },
    { property: "og:title", content: "Proposta comercial — Randon Consórcios" },
    { property: "og:description", content: "Proposta comercial personalizada de consórcio Randon." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Proposta,
});

function simulationToItem(sim: SimulationRow): ItemRow {
  return { ...sim, proposal_id: sim.id, simulation_id: sim.id, quantity: 1, sort_order: 0 };
}

function Proposta() {
  const { id } = useParams({ from: "/_authenticated/proposta/$id" });
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const proposalResult = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
      if (proposalResult.error) throw proposalResult.error;
      if (proposalResult.data) {
        const [itemsResult, sellerResult] = await Promise.all([
          supabase.from("proposal_items").select("*").eq("proposal_id", id).order("sort_order"),
          supabase.from("profiles").select("name, email, phone").eq("id", proposalResult.data.seller_id).maybeSingle(),
        ]);
        if (itemsResult.error) throw itemsResult.error;
        return { proposal: proposalResult.data, items: itemsResult.data ?? [], seller: sellerResult.data, legacy: false };
      }
      const simulationResult = await supabase.from("simulations").select("*").eq("id", id).maybeSingle();
      if (simulationResult.error) throw simulationResult.error;
      if (!simulationResult.data) return null;
      const sellerResult = await supabase.from("profiles").select("name, email, phone").eq("id", simulationResult.data.seller_id).maybeSingle();
      const proposal: ProposalRow = { id: simulationResult.data.id, seller_id: simulationResult.data.seller_id, client_name: simulationResult.data.client_name, status: "finalized", created_at: simulationResult.data.created_at, updated_at: simulationResult.data.created_at };
      return { proposal, items: [simulationToItem(simulationResult.data)], seller: sellerResult.data, legacy: true };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando proposta…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Proposta não encontrada.</p>;
  const { proposal, items, seller, legacy } = data;
  const imageIndex = [...proposal.id].reduce((total, char) => total + char.charCodeAt(0), 0) % proposalImages.length;
  const proposalImage = proposalImages[imageIndex] ?? graneleiro;
  const totals = calculateProposalTotals(items.map((item) => ({ quantity: item.quantity, credit: Number(item.credit_value), result: { totalBase: Number(item.base_amount), baseInstallment: Number(item.base_amount) / item.initial_term, installment: Number(item.installment_amount), insurance: Number(item.insurance_amount), finalAmount: Number(item.final_amount) } })));

  const text = ["Randon Consórcios / Rands — Proposta comercial", proposal.client_name ? `Cliente: ${proposal.client_name}` : null, ...items.flatMap((item, index) => ["", `Item ${index + 1} · Grupo ${item.group_code}`, `${item.quantity} ${item.quantity === 1 ? "cota" : "cotas"} × ${formatBRL(Number(item.credit_value))}`, `Crédito: ${formatBRL(Number(item.credit_value) * item.quantity)}`, `Parcela: ${formatBRL(Number(item.final_amount) * item.quantity)}/mês`]), "", `TOTAL · ${totals.quantity} ${totals.quantity === 1 ? "cota" : "cotas"}`, `Crédito total: ${formatBRL(totals.credit)}`, `Parcela total: ${formatBRL(totals.finalAmount)}/mês`, seller?.name ? `Consultor: ${seller.name}` : null, `Data: ${formatDate(proposal.created_at)}`, "Valores sujeitos às condições e regras vigentes dos grupos."].filter(Boolean).join("\n");

  async function share() { if (typeof navigator !== "undefined" && navigator.share) { try { await navigator.share({ title: "Proposta Randon Consórcios", text }); return; } catch { /* cancelado */ } } await navigator.clipboard.writeText(text); toast.success("Resumo copiado. Cole no WhatsApp do cliente."); }
  async function updateQuantity(itemId: string, value: number) { if (legacy) return; const quantity = Math.min(999, Math.max(1, Math.trunc(value || 1))); const response = await supabase.from("proposal_items").update({ quantity }).eq("id", itemId); if (response.error) { toast.error("Não foi possível atualizar a quantidade."); return; } await queryClient.invalidateQueries({ queryKey: ["proposal", id] }); }

  return <div className="space-y-6">
    <div className="no-print grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex sm:justify-between"><Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft/> Voltar</Link></Button><div className="grid min-w-0 grid-cols-2 gap-2 sm:flex"><Button variant="outline" className="min-w-0 px-2 sm:px-4" onClick={() => void share()}><Share2/> Compartilhar</Button><Button className="min-w-0 px-2 sm:px-4" onClick={() => window.print()}><Download/> Baixar PDF</Button></div></div>
    <article className="proposal-sheet surface mx-auto max-w-4xl overflow-hidden">
      <div className="relative min-h-64 overflow-hidden sm:min-h-72"><img src={proposalImage.url} alt="Implemento rodoviário Randon" className="absolute inset-0 h-full w-full object-cover"/><div className="proposal-cover-shade absolute inset-0"/><header className="relative flex min-h-64 flex-col justify-between p-5 text-primary-foreground sm:min-h-72 sm:p-10"><Brand variant="dark"/><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><p className="text-xs font-semibold uppercase text-primary-foreground/75">Proposta comercial</p><h1 className="mt-2 max-w-xl text-2xl font-semibold sm:text-4xl">Uma composição sob medida para movimentar o seu negócio.</h1></div><div className="text-xs text-primary-foreground/80 sm:text-right">Proposta personalizada<div>{formatDate(proposal.created_at)}</div></div></div></header></div>
      <div className="px-4 py-6 sm:px-10 sm:py-8"><div className="mb-7 grid gap-5 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><LabelText>Preparada para</LabelText><div className="mt-1 text-2xl font-semibold">{proposal.client_name || "Cliente Randon"}</div></div><div className="sm:text-right"><LabelText>Composição</LabelText><div className="mt-1 text-xl font-semibold text-primary">{totals.quantity} {totals.quantity === 1 ? "cota" : "cotas"} · {items.length} {items.length === 1 ? "item" : "itens"}</div></div></div>
        <div className="space-y-4">{items.map((item, index) => <section key={item.id} className="proposal-item rounded-lg border border-border p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><LabelText>Item {index + 1}</LabelText><h2 className="mt-1 text-xl font-semibold">Grupo {item.group_code}</h2><p className="mt-1 text-sm text-muted-foreground">{item.installment_type_name} · Taxa {formatPercent(Number(item.administration_rate))} · {item.insurance_included ? "Com seguro" : "Sem seguro"}</p></div>{!legacy && <div className="no-print w-28 space-y-1"><label htmlFor={`proposal-quantity-${item.id}`} className="text-xs text-muted-foreground">Quantidade</label><Input id={`proposal-quantity-${item.id}`} type="number" min={1} max={999} defaultValue={item.quantity} onBlur={(event) => void updateQuantity(item.id, Number(event.target.value))}/></div>}<div className="hidden print:block"><LabelText>Quantidade</LabelText><div className="font-semibold">{item.quantity}</div></div></div><dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><Item label="Crédito/cota" value={formatBRL(Number(item.credit_value))}/><Item label="Quantidade" value={`${item.quantity} ${item.quantity === 1 ? "cota" : "cotas"}`}/><Item label="Crédito total" value={formatBRL(Number(item.credit_value) * item.quantity)}/><Item label="Parcela/cota" value={formatBRL(Number(item.final_amount))}/><Item label="Prazo" value={`${item.initial_term} meses · ${item.remaining_term} restantes`}/><Item label="Seguro/cota" value={item.insurance_included ? formatBRL(Number(item.insurance_amount)) : "Não incluído"}/><Item label="Parcela total" value={`${formatBRL(Number(item.final_amount) * item.quantity)}/mês`}/></dl></section>)}</div>
        <div className="proposal-highlight mt-7 rounded-lg p-5 text-primary-foreground sm:p-7"><LabelText light>Total da proposta</LabelText><div className="mt-4 grid gap-5 sm:grid-cols-3"><Item label="Quantidade total" value={`${totals.quantity} ${totals.quantity === 1 ? "cota" : "cotas"}`} light/><Item label="Crédito total" value={formatBRL(totals.credit)} light/><Item label="Parcela total/mês" value={formatBRL(totals.finalAmount)} light/></div>{totals.insurance > 0 && <div className="mt-4 text-sm text-primary-foreground/75">Seguro total incluído: {formatBRL(totals.insurance)}/mês</div>}</div>
        <div className="mt-8 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] sm:items-end"><div><LabelText>Consultor</LabelText><div className="font-medium">{seller?.name || seller?.email || "—"}</div>{seller?.phone && <div className="text-muted-foreground">{seller.phone}</div>}</div><p className="text-xs leading-relaxed text-muted-foreground sm:text-right">Esta proposta é informativa. Valores sujeitos às condições, disponibilidade e regras vigentes dos grupos.</p></div>
      </div>
    </article>
  </div>;
}
function LabelText({ children, light = false }: { children: React.ReactNode; light?: boolean }) { return <div className={`text-[11px] font-semibold uppercase ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{children}</div>; }
function Item({ label, value, light = false }: { label: string; value: string; light?: boolean }) { return <div className="min-w-0"><dt className={`text-[11px] uppercase ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</dt><dd className="mt-1 break-words text-base font-medium tabular">{value}</dd></div>; }
