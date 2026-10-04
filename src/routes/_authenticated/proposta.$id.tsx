import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Pencil, Share2, TrendingUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { calculateProposalTotals } from "@/lib/proposal-calc";
import { calculateLance } from "@/lib/lance-calc";
import { createProposalPdf } from "@/lib/proposal-pdf";
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

  async function makePdf() {
    const orderedImages = [...proposalImages.slice(imageIndex), ...proposalImages.slice(0, imageIndex)];
    return createProposalPdf({ id: proposal.id, clientName: proposal.client_name, createdAt: proposal.created_at, sellerName: seller?.name || seller?.email || "Equipe Randon", sellerPhone: seller?.phone ?? null, imageUrls: orderedImages.map((image) => image.url), items });
  }
  function savePdf(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  }
  async function downloadPdf() { try { const { blob, filename } = await makePdf(); savePdf(blob, filename); toast.success("PDF baixado."); } catch { toast.error("Não foi possível gerar o PDF."); } }
  async function share() {
    try {
      const { blob, filename } = await makePdf();
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Proposta Randon Consórcios", files: [file] });
        return;
      }
      savePdf(blob, filename);
      toast.success("PDF baixado. Anexe o arquivo no WhatsApp ou e-mail.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível compartilhar o PDF.");
    }
  }
  async function updateQuantity(itemId: string, value: number) { if (legacy) return; const quantity = Math.min(999, Math.max(1, Math.trunc(value || 1))); const response = await supabase.from("proposal_items").update({ quantity }).eq("id", itemId); if (response.error) { toast.error("Não foi possível atualizar a quantidade."); return; } await queryClient.invalidateQueries({ queryKey: ["proposal", id] }); }

  return <div className="space-y-6">
    <div className="no-print grid gap-3 sm:flex sm:items-center sm:justify-between"><Button variant="ghost" size="sm" asChild><Link to="/historico" search={{ page: 1, group: "", seller: "", date: "", credit: "" }}><ArrowLeft/> Voltar</Link></Button><div className="grid min-w-0 grid-cols-2 gap-2 sm:flex"><Button variant="outline" asChild className="min-w-0 px-2 sm:px-4"><Link to="/simular" search={legacy ? { edit: undefined, legacy: id } : { edit: id, legacy: undefined }}><Pencil/> Editar</Link></Button><Button variant="outline" className="min-w-0 px-2 sm:px-4" onClick={() => void share()}><Share2/> Compartilhar</Button><Button className="min-w-0 px-2 sm:px-4" onClick={() => void downloadPdf()}><Download/> Baixar PDF</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="min-w-0 px-2 sm:px-4"><Trash2/> Excluir</Button></AlertDialogTrigger><AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg"><AlertDialogHeader><AlertDialogTitle>Excluir esta {legacy ? "simulação" : "proposta"}?</AlertDialogTitle><AlertDialogDescription>Esta ação é definitiva e removerá os dados deste registro.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { const response = legacy ? await supabase.rpc("delete_legacy_simulation", { _simulation_id: id }) : await supabase.rpc("delete_saved_proposal", { _proposal_id: id }); if (response.error) { toast.error("Não foi possível excluir."); return; } toast.success("Registro excluído."); window.location.href = "/historico"; }}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>
    <article className="proposal-sheet surface mx-auto max-w-4xl overflow-hidden">
      <div className="relative min-h-64 overflow-hidden sm:min-h-72"><img src={proposalImage.url} alt="Implemento rodoviário Randon" className="absolute inset-0 h-full w-full object-cover"/><div className="proposal-cover-shade absolute inset-0"/><header className="relative flex min-h-64 flex-col justify-between p-5 text-primary-foreground sm:min-h-72 sm:p-10"><Brand variant="dark"/><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><p className="text-xs font-semibold uppercase text-primary-foreground/75">Proposta comercial</p><h1 className="mt-2 max-w-xl text-2xl font-semibold sm:text-4xl">Uma composição sob medida para movimentar o seu negócio.</h1><p className="mt-2 max-w-xl text-sm text-primary-foreground/80 sm:text-base">Planejamento inteligente para renovar ou ampliar sua frota.</p></div><div className="text-xs text-primary-foreground/80 sm:text-right">Proposta personalizada<div>{formatDate(proposal.created_at)}</div></div></div></header></div>
      <div className="px-4 py-6 sm:px-10 sm:py-8"><div className="mb-7 grid gap-5 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><LabelText>Preparada para</LabelText><div className="mt-1 text-2xl font-semibold">{proposal.client_name || "Cliente Randon"}</div></div><div className="sm:text-right"><LabelText>Composição</LabelText><div className="mt-1 text-xl font-semibold text-primary">{totals.quantity} {totals.quantity === 1 ? "cota" : "cotas"} · {items.length} {items.length === 1 ? "item" : "itens"}</div></div></div>
        <div className="space-y-4">{items.map((item, index) => <section key={item.id} className="proposal-item rounded-lg border border-border p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><LabelText>Item {index + 1}</LabelText><h2 className="mt-1 text-xl font-semibold">Grupo {item.group_code}</h2><p className="mt-1 text-sm text-muted-foreground">{item.installment_type_name} · Taxa {formatPercent(Number(item.administration_rate))} · {item.insurance_included ? "Com seguro" : "Sem seguro"}</p></div>{!legacy && <div className="no-print w-28 space-y-1"><label htmlFor={`proposal-quantity-${item.id}`} className="text-xs text-muted-foreground">Quantidade</label><Input id={`proposal-quantity-${item.id}`} type="number" min={1} max={999} defaultValue={item.quantity} onBlur={(event) => void updateQuantity(item.id, Number(event.target.value))}/></div>}<div className="hidden print:block"><LabelText>Quantidade</LabelText><div className="font-semibold">{item.quantity}</div></div><div className="no-print"><LanceSimuladorDialog item={item}/></div></div><dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><Item label="Crédito/cota" value={formatBRL(Number(item.credit_value))}/><Item label="Quantidade" value={`${item.quantity} ${item.quantity === 1 ? "cota" : "cotas"}`}/><Item label="Crédito total" value={formatBRL(Number(item.credit_value) * item.quantity)}/><Item label="Crédito com taxa total" value={formatBRL(Number(item.base_amount) * item.quantity)}/><Item label="Fundo de reserva" value={formatPercent(Number(item.reserve_fund))}/><Item label="Parcela/cota" value={formatBRL(Number(item.final_amount))}/><Item label="Prazo" value={`${item.initial_term} meses · ${item.remaining_term} restantes`}/><Item label="Seguro/cota" value={item.insurance_included ? formatBRL(Number(item.insurance_amount)) : "Não incluído"}/><Item label="Parcela total" value={`${formatBRL(Number(item.final_amount) * item.quantity)}/mês`}/></dl></section>)}</div>
        <div className="proposal-highlight mt-7 rounded-lg p-5 text-primary-foreground sm:p-7"><LabelText light>Total da proposta</LabelText><div className="mt-4 grid gap-5 sm:grid-cols-4"><Item label="Quantidade total" value={`${totals.quantity} ${totals.quantity === 1 ? "cota" : "cotas"}`} light/><Item label="Crédito total" value={formatBRL(totals.credit)} light/><Item label="Crédito com taxa total" value={formatBRL(totals.creditWithFees)} light/><Item label="Parcela total/mês" value={formatBRL(totals.finalAmount)} light/></div>{totals.insurance > 0 && <div className="mt-4 text-sm text-primary-foreground/75">Seguro total incluído: {formatBRL(totals.insurance)}/mês</div>}</div>
        <div className="mt-8 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] sm:items-end"><div><LabelText>Consultor</LabelText><div className="font-medium">{seller?.name || seller?.email || "—"}</div>{seller?.phone && <div className="text-muted-foreground">{seller.phone}</div>}</div><p className="text-xs leading-relaxed text-muted-foreground sm:text-right">Esta proposta é informativa. Valores sujeitos às condições, disponibilidade e regras vigentes dos grupos.</p></div>
      </div>
    </article>
  </div>;
}
function LabelText({ children, light = false }: { children: React.ReactNode; light?: boolean }) { return <div className={`text-[11px] font-semibold uppercase ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{children}</div>; }
function Item({ label, value, light = false }: { label: string; value: string; light?: boolean }) { return <div className="min-w-0"><dt className={`text-[11px] uppercase ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</dt><dd className="mt-1 break-words text-base font-medium tabular">{value}</dd></div>; }

function LanceSimuladorDialog({ item }: { item: ItemRow }) {
  const [installmentPct, setInstallmentPct] = useState(String(Number(item.installment_multiplier) * 100));
  const [embeddedPct, setEmbeddedPct] = useState("40");
  const [cashPct, setCashPct] = useState("20");

  const parsePct = (value: string) => {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n / 100 : NaN;
  };

  const result = useMemo(() => {
    const reducedInstallmentRate = parsePct(installmentPct);
    const embeddedBidRate = parsePct(embeddedPct);
    const cashBidRate = parsePct(cashPct);
    if (![reducedInstallmentRate, embeddedBidRate, cashBidRate].every(Number.isFinite)) return null;
    return calculateLance({
      credit: Number(item.credit_value),
      adminRate: Number(item.administration_rate),
      reserveFund: Number(item.reserve_fund),
      initialTerm: item.initial_term,
      remainingTerm: item.remaining_term,
      reducedInstallmentRate,
      embeddedBidRate,
      cashBidRate,
      insuranceRate: Number(item.insurance_rate) || 0.0004,
    });
  }, [installmentPct, embeddedPct, cashPct, item]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp /> Simular lance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">Simular lance · Grupo {item.group_code}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>% Parcela negociada</Label>
            <Input value={installmentPct} onChange={(e) => setInstallmentPct(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>% Lance embutido</Label>
            <Input value={embeddedPct} onChange={(e) => setEmbeddedPct(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>% Lance em espécie</Label>
            <Input value={cashPct} onChange={(e) => setCashPct(e.target.value)} />
          </div>
        </div>
        {result ? (
          <dl className="mt-2 grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
            <Item label="Lance total" value={`${formatPercent(result.bidTotalRate)} · ${formatBRL(result.bidTotalAmount)}`} />
            <Item label="Crédito disponível" value={formatBRL(result.availableCredit)} />
            <Item label="Nova parcela" value={formatBRL(result.postContemplationInstallment)} />
            <Item label="Novo prazo" value={`${result.postContemplationTermMonths} meses`} />
            <Item label="Lance embutido" value={formatBRL(result.embeddedBidAmount)} />
            <Item label="Lance em espécie" value={formatBRL(result.cashBidAmount)} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Informe percentuais válidos para simular.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Simulação informativa — não é salva na proposta. Valores sujeitos às condições vigentes do grupo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
