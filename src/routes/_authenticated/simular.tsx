import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, Layers, Minus, Pencil, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupConfig, useGroups, type Group } from "@/hooks/useConfig";
import { calculate, type CalcResult } from "@/lib/calc";
import { calculateProposalTotals } from "@/lib/proposal-calc";
import { formatBRL, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/simular")({
  validateSearch: (search: Record<string, unknown>) => ({ edit: typeof search.edit === "string" ? search.edit : undefined }),
  head: () => ({ meta: [
    { title: "Nova proposta — Randon Consórcios" },
    { name: "description", content: "Monte uma proposta com várias cotas e grupos." },
    { property: "og:title", content: "Nova proposta — Randon Consórcios" },
    { property: "og:description", content: "Monte uma proposta com várias cotas e grupos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Simular,
});

const STEPS = ["Grupo", "Crédito", "Taxa", "Parcela", "Seguro", "Resultado"];

type ProposalItem = {
  key: string;
  group: Group;
  range: { id: string; credit_value: number };
  rate: { id: string; rate: number };
  type: { id: string; name: string; multiplier: number };
  insurance: boolean;
  insuranceRate: number;
  quantity: number;
  result: CalcResult;
};

function Simular() {
  const { edit: editProposalId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: groups, isLoading: loadingGroups } = useGroups(false);
  const [step, setStep] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [rangeId, setRangeId] = useState<string | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [insurance, setInsurance] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [clientName, setClientName] = useState("");
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(!!editProposalId);
  const loadedProposal = useRef<string | null>(null);
  const { data: config } = useGroupConfig(groupId);

  const group = (groups ?? []).find((g) => g.id === groupId) ?? null;
  const range = config?.ranges.find((r) => r.id === rangeId) ?? null;
  const rate = config?.rates.find((r) => r.id === rateId) ?? null;
  const type = config?.types.find((t) => t.id === typeId) ?? null;
  const insuranceRule = config?.insurance ?? null;
  const result = useMemo(() => {
    if (!group || !range || !rate || !type) return null;
    return calculate({ credit: range.credit_value, adminRate: rate.rate, reserveFund: group.reserve_fund, initialTerm: group.initial_term, multiplier: type.multiplier, insuranceRate: insuranceRule?.rate ?? 0, insuranceIncluded: insurance && !!insuranceRule });
  }, [group, range, rate, type, insurance, insuranceRule]);

  const totals = useMemo(() => calculateProposalTotals(items.map((item) => ({ quantity: item.quantity, credit: item.range.credit_value, result: item.result }))), [items]);

  useEffect(() => {
    if (!editProposalId || loadedProposal.current === editProposalId) return;
    loadedProposal.current = editProposalId;
    void (async () => {
      const proposalResponse = await supabase.from("proposals").select("client_name").eq("id", editProposalId).maybeSingle();
      if (proposalResponse.error || !proposalResponse.data) { toast.error("Proposta não encontrada."); setLoadingSaved(false); return; }
      const itemsResponse = await supabase.from("proposal_items").select("*").eq("proposal_id", editProposalId).order("sort_order");
      if (itemsResponse.error) { toast.error("Não foi possível abrir a proposta."); setLoadingSaved(false); return; }
      const savedItems = itemsResponse.data ?? [];
      const [groupRows, rangeRows, rateRows, typeRows] = await Promise.all([
        supabase.from("groups").select("*").in("id", savedItems.flatMap((item) => item.group_id ? [item.group_id] : [])),
        supabase.from("credit_ranges").select("*").in("id", savedItems.flatMap((item) => item.credit_range_id ? [item.credit_range_id] : [])),
        supabase.from("administration_rates").select("*").in("id", savedItems.flatMap((item) => item.administration_rate_id ? [item.administration_rate_id] : [])),
        supabase.from("installment_types").select("*").in("id", savedItems.flatMap((item) => item.installment_type_id ? [item.installment_type_id] : [])),
      ]);
      if (groupRows.error || rangeRows.error || rateRows.error || typeRows.error) { toast.error("Não foi possível carregar as configurações da proposta."); setLoadingSaved(false); return; }
      const restored = savedItems.flatMap((item): ProposalItem[] => {
        const savedGroup = (groupRows.data ?? []).find((row) => row.id === item.group_id);
        const savedRange = (rangeRows.data ?? []).find((row) => row.id === item.credit_range_id);
        const savedRate = (rateRows.data ?? []).find((row) => row.id === item.administration_rate_id);
        const savedType = (typeRows.data ?? []).find((row) => row.id === item.installment_type_id);
        if (!savedGroup || !savedRange || !savedRate || !savedType) return [];
        return [{ key: item.id, group: { ...savedGroup, initial_term: Number(savedGroup.initial_term), remaining_term: Number(savedGroup.remaining_term), reserve_fund: Number(savedGroup.reserve_fund) }, range: { id: savedRange.id, credit_value: Number(savedRange.credit_value) }, rate: { id: savedRate.id, rate: Number(savedRate.rate) }, type: { id: savedType.id, name: savedType.name, multiplier: Number(savedType.multiplier) }, insurance: item.insurance_included, insuranceRate: Number(item.insurance_rate), quantity: item.quantity, result: { totalBase: Number(item.base_amount), baseInstallment: Number(item.base_amount) / item.initial_term, installment: Number(item.installment_amount), insurance: Number(item.insurance_amount), finalAmount: Number(item.final_amount) } }];
      });
      if (restored.length !== savedItems.length) toast.warning("Alguma configuração antiga não está mais disponível.");
      setClientName(proposalResponse.data.client_name ?? "");
      setItems(restored);
      setLoadingSaved(false);
    })();
  }, [editProposalId]);

  function resetConfigurator() {
    setStep(0); setGroupId(null); setRangeId(null); setRateId(null); setTypeId(null); setInsurance(false); setQuantity(1); setEditingKey(null);
  }

  function addOrUpdateItem() {
    if (!group || !range || !rate || !type || !result) return;
    const item: ProposalItem = { key: editingKey ?? crypto.randomUUID(), group, range, rate, type, insurance, insuranceRate: insuranceRule?.rate ?? 0, quantity, result };
    setItems((current) => editingKey ? current.map((existing) => existing.key === editingKey ? item : existing) : [...current, item]);
    resetConfigurator();
    toast.success(editingKey ? "Item atualizado na proposta." : "Item adicionado à proposta.");
  }

  function editItem(item: ProposalItem) {
    setGroupId(item.group.id); setRangeId(item.range.id); setRateId(item.rate.id); setTypeId(item.type.id); setInsurance(item.insurance); setQuantity(item.quantity); setEditingKey(item.key); setStep(5); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateQuantity(key: string, value: number) {
    const safe = Math.min(999, Math.max(1, Math.trunc(value || 1)));
    setItems((current) => current.map((item) => item.key === key ? { ...item, quantity: safe } : item));
  }

  async function saveProposal() {
    if (!user || items.length === 0) return;
    setSaving(true);
    let proposalId: string | null = null;
    try {
      const proposalResponse = await supabase.from("proposals").insert({ seller_id: user.id, client_name: clientName.trim() || null, status: "finalized" }).select("id").single();
      if (proposalResponse.error) throw proposalResponse.error;
      proposalId = proposalResponse.data.id;
      for (const [index, item] of items.entries()) {
        const simulationResponse = await supabase.from("simulations").insert({ seller_id: user.id, client_name: clientName.trim() || null, group_id: item.group.id, credit_range_id: item.range.id, administration_rate_id: item.rate.id, installment_type_id: item.type.id, group_code: item.group.code, credit_value: item.range.credit_value, administration_rate: item.rate.rate, reserve_fund: item.group.reserve_fund, installment_type_name: item.type.name, installment_multiplier: item.type.multiplier, initial_term: item.group.initial_term, remaining_term: item.group.remaining_term, insurance_included: item.insurance, insurance_rate: item.insuranceRate, base_amount: item.result.totalBase, installment_amount: item.result.installment, insurance_amount: item.result.insurance, final_amount: item.result.finalAmount }).select("id").single();
        if (simulationResponse.error) throw simulationResponse.error;
        const itemResponse = await supabase.from("proposal_items").insert({ proposal_id: proposalId, simulation_id: simulationResponse.data.id, sort_order: index, quantity: item.quantity, group_id: item.group.id, credit_range_id: item.range.id, administration_rate_id: item.rate.id, installment_type_id: item.type.id, group_code: item.group.code, credit_value: item.range.credit_value, administration_rate: item.rate.rate, reserve_fund: item.group.reserve_fund, installment_type_name: item.type.name, installment_multiplier: item.type.multiplier, initial_term: item.group.initial_term, remaining_term: item.group.remaining_term, insurance_included: item.insurance, insurance_rate: item.insuranceRate, base_amount: item.result.totalBase, installment_amount: item.result.installment, insurance_amount: item.result.insurance, final_amount: item.result.finalAmount });
        if (itemResponse.error) throw itemResponse.error;
      }
      await navigate({ to: "/proposta/$id", params: { id: proposalId } });
    } catch (error) {
      if (proposalId) await supabase.from("proposals").delete().eq("id", proposalId);
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a proposta.");
    } finally { setSaving(false); }
  }

  return <div className="space-y-6 sm:space-y-8">
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div><h1 className="text-2xl font-semibold sm:text-3xl">Compor proposta</h1><p className="mt-1 text-sm text-muted-foreground">Simule cada plano e reúna quantas cotas e grupos precisar.</p></div>
      {items.length > 0 && <div className="surface flex items-center gap-3 px-4 py-3"><ShoppingCart className="h-5 w-5 text-primary"/><div><div className="text-xs text-muted-foreground">Itens da proposta</div><div className="font-semibold">{items.length} {items.length === 1 ? "item" : "itens"} · {totals.quantity} {totals.quantity === 1 ? "cota" : "cotas"}</div></div></div>}
    </div>

    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">{STEPS.map((label, i) => <li key={label} className="min-w-0"><Button type="button" variant={i === step ? "default" : "outline"} disabled={i > step} onClick={() => setStep(i)} className="h-auto min-h-14 w-full flex-col items-start gap-0 px-2 py-2 text-left sm:px-3"><span className="text-[10px] uppercase opacity-70">Passo {i + 1}</span><span className="max-w-full truncate text-xs">{label}</span></Button></li>)}</ol>
    {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="-ml-2"><ArrowLeft className="h-4 w-4"/> Voltar</Button>}

    {step === 0 && <Section title="Escolher grupo">{loadingGroups && <p className="text-sm text-muted-foreground">Carregando grupos…</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(groups ?? []).map((g) => <ChoiceCard key={g.id} selected={groupId === g.id} onClick={() => { setGroupId(g.id); setRangeId(null); setRateId(null); setTypeId(null); setStep(1); }}><div className="text-xs uppercase text-muted-foreground">Grupo</div><div className="mt-1 text-2xl font-semibold">{g.code}</div><p className="mt-2 text-sm text-muted-foreground">{g.initial_term} meses · {g.remaining_term} restantes</p></ChoiceCard>)}</div></Section>}
    {step === 1 && group && <Section title="Escolher faixa de crédito"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(config?.ranges ?? []).map((r) => <ChoiceCard key={r.id} selected={rangeId === r.id} onClick={() => { setRangeId(r.id); setStep(2); }}><div className="text-xs uppercase text-muted-foreground">Crédito por cota</div><div className="mt-1 text-2xl font-semibold tabular">{formatBRL(r.credit_value)}</div><p className="mt-2 text-sm text-muted-foreground">Grupo {group.code} · {group.remaining_term} meses restantes</p></ChoiceCard>)}</div></Section>}
    {step === 2 && <Section title="Taxa de administração"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(config?.rates ?? []).map((r) => <ChoiceCard key={r.id} selected={rateId === r.id} onClick={() => { setRateId(r.id); setStep(3); }}><div className="text-xs uppercase text-muted-foreground">Taxa</div><div className="mt-1 text-3xl font-semibold tabular">{formatPercent(r.rate)}</div><p className="mt-2 text-sm text-muted-foreground">Fundo {formatPercent(group?.reserve_fund ?? 0)}</p></ChoiceCard>)}</div></Section>}
    {step === 3 && <Section title="Tipo de parcela"><div className="grid gap-4 sm:grid-cols-2">{(config?.types ?? []).map((t) => <ChoiceCard key={t.id} selected={typeId === t.id} onClick={() => { setTypeId(t.id); setStep(4); }}><div className="text-lg font-semibold uppercase">{t.name}</div><p className="mt-2 text-sm text-muted-foreground">{Math.round(t.multiplier * 100)}% da parcela</p></ChoiceCard>)}</div></Section>}
    {step === 4 && <Section title="Seguro prestamista"><div className="grid gap-4 sm:grid-cols-2"><ChoiceCard selected={!insurance} onClick={() => { setInsurance(false); setStep(5); }}><div className="text-lg font-semibold">Não incluir</div><p className="mt-2 text-sm text-muted-foreground">Parcela sem seguro.</p></ChoiceCard><ChoiceCard selected={insurance} onClick={() => { setInsurance(true); setStep(5); }}><div className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary"/> Incluir</div><p className="mt-2 text-sm text-muted-foreground">{insuranceRule ? `${formatPercent(insuranceRule.rate)} sobre o crédito + taxas.` : "Seguro não configurado."}</p></ChoiceCard></div></Section>}

    {step === 5 && result && group && range && rate && type && <div className="space-y-6"><div className="surface overflow-hidden"><div className="border-b border-border px-4 py-5 sm:px-6"><h2 className="text-xl font-semibold">Simulação pronta</h2><p className="mt-1 text-sm text-muted-foreground">O cálculo individual permanece a referência deste item.</p></div><dl className="grid grid-cols-2 gap-5 px-4 py-6 sm:grid-cols-4 sm:px-6"><Field label="Grupo" value={group.code}/><Field label="Crédito/cota" value={formatBRL(range.credit_value)}/><Field label="Taxa" value={formatPercent(rate.rate)}/><Field label="Modalidade" value={type.name}/><Field label="Prazo" value={`${group.initial_term} meses`}/><Field label="Seguro" value={insurance ? "Incluído" : "Não incluído"}/><Field label="Parcela/cota" value={formatBRL(result.finalAmount)}/></dl><div className="border-t border-border bg-secondary/40 px-4 py-6 sm:px-6"><div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-end"><div className="space-y-2"><Label htmlFor="quantity">Quantidade de cotas</Label><div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-2"><Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade"><Minus/></Button><Input id="quantity" type="number" min={1} max={999} value={quantity} onChange={(event) => setQuantity(Math.min(999, Math.max(1, Number(event.target.value) || 1)))} className="text-center text-lg font-semibold"/><Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(999, quantity + 1))} aria-label="Aumentar quantidade"><Plus/></Button></div></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Field label="Cotas" value={String(quantity)}/><Field label="Crédito total" value={formatBRL(range.credit_value * quantity)}/><Field label="Parcela total/mês" value={formatBRL(result.finalAmount * quantity)}/></div></div></div></div><div className="grid gap-3 sm:flex sm:flex-wrap"><Button size="lg" onClick={addOrUpdateItem} className="w-full sm:w-auto"><ShoppingCart/> {editingKey ? "Atualizar item" : "Adicionar à proposta"}</Button><CompareDialog groupReserve={group.reserve_fund} initialTerm={group.initial_term} credit={range.credit_value} rates={config?.rates ?? []} types={config?.types ?? []} insuranceRate={insuranceRule?.rate ?? 0}/></div></div>}

    {items.length > 0 && <section className="space-y-4 border-t border-border pt-7"><div><h2 className="text-xl font-semibold">Itens da proposta</h2><p className="mt-1 text-sm text-muted-foreground">Revise a negociação antes de gerar a proposta final.</p></div><div className="space-y-3">{items.map((item, index) => <div key={item.key} className="surface p-4 sm:p-5"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem_auto]"><div className="min-w-0"><div className="text-xs uppercase text-muted-foreground">Item {index + 1} · Grupo {item.group.code}</div><div className="mt-1 font-semibold">{item.type.name} · {formatPercent(item.rate.rate)} · {item.insurance ? "Com seguro" : "Sem seguro"}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><Field label="Crédito/cota" value={formatBRL(item.range.credit_value)}/><Field label="Parcela/cota" value={formatBRL(item.result.finalAmount)}/><Field label="Crédito total" value={formatBRL(item.range.credit_value * item.quantity)}/><Field label="Parcela total" value={formatBRL(item.result.finalAmount * item.quantity)}/></div></div><div className="space-y-2"><Label htmlFor={`quantity-${item.key}`}>Quantidade</Label><Input id={`quantity-${item.key}`} type="number" min={1} max={999} value={item.quantity} onChange={(event) => updateQuantity(item.key, Number(event.target.value))}/></div><div className="flex items-end gap-2"><Button variant="outline" size="icon" onClick={() => editItem(item)} aria-label={`Editar item ${index + 1}`}><Pencil/></Button><Button variant="outline" size="icon" onClick={() => setItems((current) => current.filter((currentItem) => currentItem.key !== item.key))} aria-label={`Remover item ${index + 1}`}><Trash2/></Button></div></div></div>)}</div><div className="proposal-highlight rounded-lg p-5 text-primary-foreground sm:p-6"><div className="text-xs uppercase text-primary-foreground/70">Total da proposta</div><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"><Field label="Quantidade total" value={`${totals.quantity} ${totals.quantity === 1 ? "cota" : "cotas"}`}/><Field label="Crédito total" value={formatBRL(totals.credit)}/><Field label="Parcela total/mês" value={formatBRL(totals.finalAmount)}/></div></div><div className="surface space-y-4 p-4 sm:p-6"><div className="max-w-md space-y-2"><Label htmlFor="cliente">Nome do cliente (opcional)</Label><Input id="cliente" value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Ex.: Transportes Silva Ltda"/></div><div className="grid gap-3 sm:flex"><Button variant="outline" size="lg" onClick={resetConfigurator} className="w-full sm:w-auto"><Plus/> Adicionar outro grupo</Button><Button size="lg" onClick={() => void saveProposal()} disabled={saving} className="w-full sm:w-auto"><FileText/> {saving ? "Gerando…" : "Gerar proposta final"}</Button></div></div></section>}
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-4"><h2 className="text-sm font-semibold uppercase text-muted-foreground">{title}</h2>{children}</section>; }
function ChoiceCard({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick?: () => void }) { return <Button type="button" variant="outline" onClick={onClick} className={`surface relative h-auto min-h-28 w-full whitespace-normal p-4 text-left transition-all hover:-translate-y-0.5 sm:p-5 ${selected ? "ring-2 ring-primary" : ""}`}><span className="block w-full">{selected && <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5"/></span>}{children}</span></Button>; }
function Field({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-[11px] uppercase text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-base font-medium tabular">{value}</dd></div>; }
function CompareDialog({ credit, rates, types, groupReserve, initialTerm, insuranceRate }: { credit: number; rates: Array<{id:string;rate:number}>; types:Array<{id:string;name:string;multiplier:number}>; groupReserve:number; initialTerm:number; insuranceRate:number }) { const options = types.flatMap((t) => rates.flatMap((r) => [false,true].map((ins) => ({ key:`${t.id}-${r.id}-${ins}`, type:t, rate:r, ins, result:calculate({credit,adminRate:r.rate,reserveFund:groupReserve,initialTerm,multiplier:t.multiplier,insuranceRate,insuranceIncluded:ins}) })))); return <Dialog><DialogTrigger asChild><Button variant="outline" size="lg" className="w-full sm:w-auto"><Layers/> Comparar opções</Button></DialogTrigger><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle className="pr-6">Comparar opções · {formatBRL(credit)}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{options.map((option, index) => <div key={option.key} className="rounded-lg border border-border p-4"><div className="text-[11px] uppercase text-muted-foreground">Opção {index + 1}</div><div className="mt-1 font-medium">{option.type.name}</div><div className="text-sm text-muted-foreground">Taxa {formatPercent(option.rate.rate)} · {option.ins ? "Com seguro" : "Sem seguro"}</div><div className="mt-3 text-2xl font-semibold tabular text-primary">{formatBRL(option.result.finalAmount)}</div></div>)}</div></DialogContent></Dialog>; }
