import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Pencil, Share2, TrendingUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsMultieixo } from "@/hooks/useAuth";
import { canEditProposal } from "@/lib/dealer-manager";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { calculateProposalTotals } from "@/lib/proposal-calc";
import { DEFAULT_LANCE_MODALITY, LANCE_MODALITIES, isReduceTermBlocked, lanceInputFromItem, parseLancePercent, simulateLance, type LanceModality } from "@/lib/lance-calc";
import { createLanceDraft } from "@/lib/lance-draft";
import { formatContractModality, savedContractTerm } from "@/lib/calc";
import { createProposalPdf } from "@/lib/proposal-pdf";
import { formatBRL, formatDate, formatPercent, formatInstallmentType } from "@/lib/format";
import graneleiro from "@/assets/graneleiro-kv.jpg.asset.json";
import florestal from "@/assets/florestal.jpg.asset.json";
import basculante from "@/assets/basculante-4-eixos.jpg.asset.json";
import tanque from "@/assets/tanque-4e-preto.jpg.asset.json";
import type { Database } from "@/integrations/supabase/types";

const proposalImages = [graneleiro, florestal, basculante, tanque];
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
  return { ...sim, proposal_id: sim.id, simulation_id: sim.id, quantity: 1, sort_order: 0, lance_embedded_rate: null, lance_cash_rate: null, lance_modality: null };
}

function Proposta() {
  const { id } = useParams({ from: "/_authenticated/proposta/$id" });
  const queryClient = useQueryClient();
  const { user, isAdmin, isDealerManager } = useAuth();
  const multieixo = useIsMultieixo();
  const { data, isLoading } = useQuery({
    queryKey: ["proposal", id, user?.id],
    queryFn: async () => {
      const proposalResult = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
      if (proposalResult.error) throw proposalResult.error;
      if (proposalResult.data) {
        const [itemsResult, sellerResult] = await Promise.all([
          supabase.from("proposal_items").select("*").eq("proposal_id", id).order("sort_order"),
          supabase.from("profiles").select("name, email, phone").eq("id", proposalResult.data.seller_id).maybeSingle(),
        ]);
        if (itemsResult.error) throw itemsResult.error;
        const contact = isDealerManager ? await supabase.rpc("get_dealer_manager_seller_contact", { _seller_id: proposalResult.data.seller_id }) : null;
        return { proposal: proposalResult.data, items: itemsResult.data ?? [], seller: (contact?.data as { name: string; email: string; phone: string | null } | null) ?? sellerResult.data, legacy: false };
      }
      const simulationResult = await supabase.from("simulations").select("*").eq("id", id).maybeSingle();
      if (simulationResult.error) throw simulationResult.error;
      if (!simulationResult.data) return null;
      const sellerResult = await supabase.from("profiles").select("name, email, phone").eq("id", simulationResult.data.seller_id).maybeSingle();
      const proposal: ProposalRow = { id: simulationResult.data.id, seller_id: simulationResult.data.seller_id, client_name: simulationResult.data.client_name, status: "finalized", created_at: simulationResult.data.created_at, updated_at: simulationResult.data.created_at };
      const contact = isDealerManager ? await supabase.rpc("get_dealer_manager_seller_contact", { _seller_id: simulationResult.data.seller_id }) : null;
      return { proposal, items: [simulationToItem(simulationResult.data)], seller: (contact?.data as { name: string; email: string; phone: string | null } | null) ?? sellerResult.data, legacy: true };
    },
  });

  const lanceHighlightDone = useRef(false);
  useEffect(() => {
    if (!data || lanceHighlightDone.current) return;
    const flagKey = `lance-cta:${data.proposal.id}`;
    if (sessionStorage.getItem(flagKey) !== "1") return;
    lanceHighlightDone.current = true;
    sessionStorage.removeItem(flagKey);
    const firstItem = data.items[0];
    if (!firstItem) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`lance-cta-${firstItem.id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("lance-cta-highlight");
        window.setTimeout(() => target.classList.remove("lance-cta-highlight"), 6000);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando proposta…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Proposta não encontrada.</p>;
  const { proposal, items, seller, legacy } = data;
  const editable = canEditProposal(user?.id, proposal.seller_id, isAdmin);
  const imageIndex = [...proposal.id].reduce((total, char) => total + char.charCodeAt(0), 0) % proposalImages.length;
  const proposalImage = proposalImages[imageIndex] ?? graneleiro;
  const totals = calculateProposalTotals(items.map((item) => ({ quantity: item.quantity, credit: Number(item.credit_value), result: { totalBase: Number(item.base_amount), baseInstallment: Number(item.base_amount) / savedContractTerm(item), installment: Number(item.installment_amount), insurance: Number(item.insurance_amount), finalAmount: Number(item.final_amount) } })));

  async function makePdf() {
    const orderedImages = [...proposalImages.slice(imageIndex), ...proposalImages.slice(0, imageIndex)];
    return createProposalPdf({ id: proposal.id, clientName: proposal.client_name, createdAt: proposal.created_at, sellerName: seller?.name || seller?.email || "Equipe Randon", sellerPhone: seller?.phone ?? null, imageUrls: orderedImages.map((image) => image.url), multieixo, items });
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
  async function updateQuantity(itemId: string, value: number) { if (legacy || !editable) return; const quantity = Math.min(999, Math.max(1, Math.trunc(value || 1))); const response = await supabase.from("proposal_items").update({ quantity }).eq("id", itemId); if (response.error) { toast.error("Não foi possível atualizar a quantidade."); return; } await queryClient.invalidateQueries({ queryKey: ["proposal", id] }); }

  return <div className="space-y-6">
    <div className="no-print grid gap-3 sm:flex sm:items-center sm:justify-between"><Button variant="ghost" size="sm" asChild><Link to="/historico" search={{ page: 1, group: "", seller: "", date: "", credit: "" }}><ArrowLeft/> Voltar</Link></Button><div className="grid min-w-0 grid-cols-2 gap-2 sm:flex">{editable && <Button variant="outline" asChild className="min-w-0 px-2 sm:px-4"><Link to="/simular" search={legacy ? { edit: undefined, legacy: id } : { edit: id, legacy: undefined }}><Pencil/> Editar</Link></Button>}<Button variant="outline" className="min-w-0 px-2 sm:px-4" onClick={() => void share()}><Share2/> Compartilhar</Button><Button className="min-w-0 px-2 sm:px-4" onClick={() => void downloadPdf()}><Download/> Baixar PDF</Button>{editable && <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="min-w-0 px-2 sm:px-4"><Trash2/> Excluir</Button></AlertDialogTrigger><AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg"><AlertDialogHeader><AlertDialogTitle>Excluir esta {legacy ? "simulação" : "proposta"}?</AlertDialogTitle><AlertDialogDescription>Esta ação é definitiva e removerá os dados deste registro.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { const response = legacy ? await supabase.rpc("delete_legacy_simulation", { _simulation_id: id }) : await supabase.rpc("delete_saved_proposal", { _proposal_id: id }); if (response.error) { toast.error("Não foi possível excluir."); return; } toast.success("Registro excluído."); window.location.href = "/historico"; }}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div></div>
    <article className="proposal-sheet surface mx-auto max-w-4xl overflow-hidden">
      <div className="relative min-h-64 overflow-hidden sm:min-h-72"><img src={proposalImage.url} alt="Implemento rodoviário Randon" className="absolute inset-0 h-full w-full object-cover"/><div className="proposal-cover-shade absolute inset-0"/><header className="relative flex min-h-64 flex-col justify-between p-5 text-primary-foreground sm:min-h-72 sm:p-10"><Brand variant="dark"/><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><p className="text-xs font-semibold uppercase text-primary-foreground/75">Proposta comercial</p><h1 className="mt-2 max-w-xl text-2xl font-semibold sm:text-4xl">Planejamento inteligente para renovar ou ampliar sua frota.</h1></div><div className="text-xs text-primary-foreground/80 sm:text-right">Proposta personalizada<div>{formatDate(proposal.created_at)}</div></div></div></header></div>
      <div className="px-4 py-6 sm:px-10 sm:py-8"><div className="mb-7 grid gap-5 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><LabelText>Preparada para</LabelText><div className="mt-1 text-2xl font-semibold">{proposal.client_name || "Cliente Randon"}</div></div><div className="sm:text-right"><LabelText>Composição</LabelText><div className="mt-1 text-xl font-semibold text-primary">{totals.quantity} {totals.quantity === 1 ? "cota" : "cotas"} · {items.length} {items.length === 1 ? "item" : "itens"}</div></div></div>
        <div className="space-y-4">{items.map((item, index) => <section key={item.id} className="proposal-item rounded-lg border border-border p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><LabelText>Item {index + 1}</LabelText><h2 className="mt-1 text-xl font-semibold">Grupo {item.group_code}</h2><p className="mt-1 text-sm text-muted-foreground">{formatContractModality(item.contract_modality)} · {formatInstallmentType(item.installment_type_name, item.installment_multiplier)} · Taxa {formatPercent(Number(item.administration_rate))} · FR {formatPercent(Number(item.reserve_fund))} · {item.insurance_included ? "Com seguro" : "Sem seguro"}</p></div>{!legacy && editable && <div className="no-print w-28 space-y-1"><label htmlFor={`proposal-quantity-${item.id}`} className="text-xs text-muted-foreground">Quantidade</label><Input id={`proposal-quantity-${item.id}`} type="number" min={1} max={999} defaultValue={item.quantity} onBlur={(event) => void updateQuantity(item.id, Number(event.target.value))}/></div>}<div className="hidden print:block"><LabelText>Quantidade</LabelText><div className="font-semibold">{item.quantity}</div></div><div className="no-print"><LanceSimuladorDialog item={item} legacy={legacy} readOnly={!editable} onSaved={() => void queryClient.invalidateQueries({ queryKey: ["proposal", id] })}/></div></div><dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><Item label="Crédito/cota" value={formatBRL(Number(item.credit_value))}/><Item label="Quantidade" value={`${item.quantity} ${item.quantity === 1 ? "cota" : "cotas"}`}/><Item label="Crédito total" value={formatBRL(Number(item.credit_value) * item.quantity)}/><Item label="Crédito com taxa total" value={formatBRL(Number(item.base_amount) * item.quantity)}/><Item label="Parcela/cota" value={formatBRL(Number(item.final_amount))}/><Item label="Prazo" value={`${item.initial_term} meses · ${item.remaining_term} restantes`}/><Item label="Parcela total" value={`${formatBRL(Number(item.final_amount) * item.quantity)}/mês`}/></dl></section>)}</div>
        <div className="proposal-highlight mt-7 rounded-lg p-5 text-primary-foreground sm:p-7"><LabelText light>Total da proposta</LabelText><div className="mt-4 grid gap-5 sm:grid-cols-4"><Item label="Quantidade total" value={`${totals.quantity} ${totals.quantity === 1 ? "cota" : "cotas"}`} light/><Item label="Crédito total" value={formatBRL(totals.credit)} light/><Item label="Crédito com taxa total" value={formatBRL(totals.creditWithFees)} light/><Item label="Parcela total/mês" value={formatBRL(totals.finalAmount)} light/></div></div>
        <div className="mt-8 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] sm:items-end"><div><LabelText>Consultor</LabelText><div className="font-medium">{seller?.name || seller?.email || "—"}</div>{seller?.phone && <div className="text-muted-foreground">{seller.phone}</div>}</div><p className="text-xs leading-relaxed text-muted-foreground sm:text-right">Esta proposta é informativa. Valores sujeitos às condições, disponibilidade e regras vigentes dos grupos.</p></div>
      </div>
    </article>
  </div>;
}
function LabelText({ children, light = false }: { children: React.ReactNode; light?: boolean }) { return <div className={`text-[11px] font-semibold uppercase ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{children}</div>; }
function Item({ label, value, light = false }: { label: string; value: string; light?: boolean }) { return <div className="min-w-0"><dt className={`text-[11px] uppercase ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</dt><dd className="mt-1 break-words text-base font-medium tabular">{value}</dd></div>; }

function LanceSimuladorDialog({ item, legacy, readOnly, onSaved }: { item: ItemRow; legacy: boolean; readOnly: boolean; onSaved: () => void }) {
  const alreadySaved = item.lance_embedded_rate !== null && item.lance_cash_rate !== null;
  const [embeddedPct, setEmbeddedPct] = useState(() => createLanceDraft().embeddedPct);
  const [cashPct, setCashPct] = useState(() => createLanceDraft().cashPct);
  const [modality, setModality] = useState<LanceModality>(() => createLanceDraft().modality);
  const [saving, setSaving] = useState(false);

  const lanceInput = useMemo(() => {
    const embeddedBidRate = parseLancePercent(embeddedPct);
    const cashBidRate = parseLancePercent(cashPct);
    if (![embeddedBidRate, cashBidRate].every(Number.isFinite)) return null;
    return lanceInputFromItem(item, { embeddedBidRate, cashBidRate }, DEFAULT_LANCE_MODALITY);
  }, [embeddedPct, cashPct, item]);
  // Novo prazo maior que o prazo restante: Reduzir prazo fica em cinza e vale Reduzir parcela.
  const reduceTermBlocked = lanceInput ? isReduceTermBlocked(lanceInput) : false;
  const effectiveModality: LanceModality = reduceTermBlocked ? "reduzir_parcela" : modality;
  const simulation = useMemo(
    () =>
      lanceInput
        ? simulateLance({ ...lanceInput, modality: effectiveModality })
        : { ok: false as const, error: "Informe percentuais de lance válidos." },
    [lanceInput, effectiveModality],
  );
  const result = simulation.ok ? simulation.simulation : null;

  async function saveLance() {
    if (!result || readOnly) return;
    setSaving(true);
    const { error } = await supabase
      .from("proposal_items")
      .update({ lance_embedded_rate: parseLancePercent(embeddedPct), lance_cash_rate: parseLancePercent(cashPct), lance_modality: effectiveModality })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a simulação.");
      return;
    }
    toast.success("Simulação salva — vai aparecer na última página do PDF.");
    onSaved();
  }

  async function removeSavedLance() {
    if (readOnly) return;
    setSaving(true);
    const { error } = await supabase
      .from("proposal_items")
      .update({ lance_embedded_rate: null, lance_cash_rate: null, lance_modality: null })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível remover a simulação.");
      return;
    }
    toast.success("Simulação removida.");
    onSaved();
  }

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) return;
      const draft = createLanceDraft();
      setEmbeddedPct(draft.embeddedPct);
      setCashPct(draft.cashPct);
      setModality(draft.modality);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" id={`lance-cta-${item.id}`}>
          <TrendingUp /> Simular lance{alreadySaved && " · salva"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">Simular lance · Grupo {item.group_code}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`embedded-${item.id}`}>% Lance embutido</Label>
            <Input id={`embedded-${item.id}`} inputMode="decimal" placeholder="0" value={embeddedPct} onChange={(e) => setEmbeddedPct(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cash-${item.id}`}>% Lance em espécie</Label>
            <Input id={`cash-${item.id}`} inputMode="decimal" placeholder="0" value={cashPct} onChange={(e) => setCashPct(e.target.value)} />
          </div>
        </div>
        <div role="radiogroup" aria-label="Modalidade do lance" className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(LANCE_MODALITIES) as LanceModality[]).map((option) => {
            const disabled = option === "reduzir_prazo" && reduceTermBlocked;
            return (
            <Button
              variant="outline"
              key={option}
              type="button"
              role="radio"
              aria-checked={effectiveModality === option}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => setModality(option)}
              className={`h-auto flex-col items-start whitespace-normal rounded-lg border p-3 text-left transition-colors ${disabled ? "cursor-not-allowed border-border bg-muted opacity-60" : effectiveModality === option ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {LANCE_MODALITIES[option].label}{option === "reduzir_parcela" && reduceTermBlocked && " (obrigatório)"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{disabled ? "Indisponível: o novo prazo ultrapassa o prazo restante do grupo." : LANCE_MODALITIES[option].description}</p>
            </Button>
            );
          })}
        </div>
        {result ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Grupo {item.group_code} · {formatPercent(result.bidTotalRate)} de lance total</span>
              <span className="font-medium text-foreground">
                {item.quantity} {item.quantity === 1 ? "cota" : "cotas"}
              </span>
            </div>

            <div className="rounded-lg border border-border p-4">
              <LabelText>Simulação · {LANCE_MODALITIES[effectiveModality].label} · por cota</LabelText>
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Item label={`Lance embutido (${formatPercent(parseLancePercent(embeddedPct))})`} value={formatBRL(result.embeddedBidAmount)} />
                <Item label={`Lance em espécie (${formatPercent(parseLancePercent(cashPct))})`} value={formatBRL(result.cashBidAmount)} />
                <Item label="Valor do lance" value={formatBRL(result.bidTotalAmount)} />
                <Item label="Crédito disponível" value={formatBRL(result.availableCredit)} />
                <Item label="Nova parcela" value={formatBRL(result.newInstallment)} />
                <Item label="Novo prazo" value={`${result.newTermMonths} meses`} />
                {result.lastInstallment !== result.newInstallment && <Item label="Última parcela" value={formatBRL(result.lastInstallment)} />}
              </dl>
            </div>

            {item.quantity > 1 && (
              <div className="proposal-highlight rounded-lg p-4 text-primary-foreground">
                <LabelText light>Total · {item.quantity} cotas</LabelText>
                <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Item light label="Lance em espécie total" value={formatBRL(result.cashBidAmount * item.quantity)} />
                  <Item light label="Crédito disponível" value={formatBRL(result.availableCredit * item.quantity)} />
                  <Item light label="Nova parcela" value={formatBRL(result.newInstallment * item.quantity)} />
                </dl>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Estimativa informativa, sujeita às condições vigentes do grupo e à confirmação da administradora.</p>
          </div>
        ) : (
          <p className="text-sm text-destructive">{simulation.ok ? "" : simulation.error}</p>
        )}

        {readOnly ? null : legacy ? (
          <p className="text-xs text-muted-foreground">
            Simulações antigas não podem ser salvas — crie uma proposta nova para guardar esse lance.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void saveLance()} disabled={saving || !result}>
              {saving ? "Salvando…" : alreadySaved ? "Atualizar simulação salva" : "Salvar simulação nesta proposta"}
            </Button>
            {alreadySaved && (
              <Button size="sm" variant="outline" onClick={() => void removeSavedLance()} disabled={saving}>
                Remover
              </Button>
            )}
            <p className="w-full text-xs text-muted-foreground">
              Salvando, essa simulação aparece numa página extra ao gerar o PDF da proposta.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
