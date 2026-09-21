import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, Layers, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupConfig, useGroups } from "@/hooks/useConfig";
import { calculate } from "@/lib/calc";
import { formatBRL, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/simular")({
  head: () => ({
    meta: [
      { title: "Nova simulação — Randon Consórcios" },
      { name: "description", content: "Monte sua simulação de consórcio em poucos passos." },
      { property: "og:title", content: "Nova simulação — Randon Consórcios" },
      {
        property: "og:description",
        content: "Monte sua simulação de consórcio em poucos passos.",
      },
    ],
  }),
  component: Simular,
});

const STEPS = ["Grupo", "Crédito", "Taxa", "Parcela", "Seguro", "Resultado"];

function Simular() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [step, setStep] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [rangeId, setRangeId] = useState<string | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [insurance, setInsurance] = useState(false);
  const [clientName, setClientName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: config } = useGroupConfig(groupId);

  const group = (groups ?? []).find((g) => g.id === groupId) ?? null;
  const range = config?.ranges.find((r) => r.id === rangeId) ?? null;
  const rate = config?.rates.find((r) => r.id === rateId) ?? null;
  const type = config?.types.find((t) => t.id === typeId) ?? null;
  const insuranceRule = config?.insurance ?? null;

  const result = useMemo(() => {
    if (!group || !range || !rate || !type) return null;
    return calculate({
      credit: range.credit_value,
      adminRate: rate.rate,
      reserveFund: group.reserve_fund,
      initialTerm: group.initial_term,
      multiplier: type.multiplier,
      insuranceRate: insuranceRule?.rate ?? 0,
      insuranceIncluded: insurance && !!insuranceRule,
    });
  }, [group, range, rate, type, insurance, insuranceRule]);

  async function saveAndOpenProposal() {
    if (!group || !range || !rate || !type || !result || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("simulations")
        .insert({
          seller_id: user.id,
          client_name: clientName || null,
          group_id: group.id,
          credit_range_id: range.id,
          administration_rate_id: rate.id,
          installment_type_id: type.id,
          group_code: group.code,
          credit_value: range.credit_value,
          administration_rate: rate.rate,
          reserve_fund: group.reserve_fund,
          installment_type_name: type.name,
          installment_multiplier: type.multiplier,
          initial_term: group.initial_term,
          remaining_term: group.remaining_term,
          insurance_included: insurance,
          insurance_rate: insuranceRule?.rate ?? 0,
          base_amount: result.totalBase,
          installment_amount: result.installment,
          insurance_amount: result.insurance,
          final_amount: result.finalAmount,
        })
        .select("id")
        .single();
      if (error) throw error;
      await navigate({ to: "/proposta/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a simulação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Simulador de Consórcios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monte sua simulação em poucos passos.</p>
      </div>

      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0">
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className={`min-h-14 w-full rounded-lg border px-2 py-2 text-left text-xs transition-colors sm:px-3 ${
                i === step
                  ? "border-primary bg-primary/5 text-primary"
                  : i < step
                    ? "border-border bg-card text-foreground"
                    : "border-dashed border-border bg-transparent text-muted-foreground"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-[0.14em] opacity-70">
                Passo {i + 1}
              </span>
              <span className="block truncate font-medium">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
      )}

      {/* PASSO 1 — GRUPO */}
      {step === 0 && (
        <Section title="Escolher grupo">
          {loadingGroups && <p className="text-sm text-muted-foreground">Carregando grupos…</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(groups ?? []).map((g) => (
              <Card
                key={g.id}
                selected={groupId === g.id}
                onClick={() => {
                  setGroupId(g.id);
                  setRangeId(null);
                  setRateId(null);
                  setTypeId(null);
                  setStep(1);
                }}
              >
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Grupo
                </div>
                <div className="mt-1 text-2xl font-semibold">{g.code}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {g.initial_term} meses de prazo · {g.remaining_term} meses restantes
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* PASSO 2 — CRÉDITO */}
      {step === 1 && group && (
        <Section title="Escolher faixa de crédito">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(config?.ranges ?? []).map((r) => (
              <Card
                key={r.id}
                selected={rangeId === r.id}
                onClick={() => {
                  setRangeId(r.id);
                  setStep(2);
                }}
              >
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Crédito
                </div>
                <div className="mt-1 text-2xl font-semibold tabular">
                  {formatBRL(r.credit_value)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Grupo {group.code} · {group.remaining_term} meses restantes
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Selecionar
                </span>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* PASSO 3 — TAXA */}
      {step === 2 && (
        <Section title="Taxa de administração">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(config?.rates ?? []).map((r) => (
              <Card
                key={r.id}
                selected={rateId === r.id}
                onClick={() => {
                  setRateId(r.id);
                  setStep(3);
                }}
              >
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Taxa de administração
                </div>
                <div className="mt-1 text-3xl font-semibold tabular">{formatPercent(r.rate)}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fundo de reserva {formatPercent(group?.reserve_fund ?? 0)}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* PASSO 4 — PARCELA */}
      {step === 3 && (
        <Section title="Tipo de parcela">
          <div className="grid gap-4 sm:grid-cols-2">
            {(config?.types ?? []).map((t) => (
              <Card
                key={t.id}
                selected={typeId === t.id}
                onClick={() => {
                  setTypeId(t.id);
                  setStep(4);
                }}
              >
                <div className="text-lg font-semibold uppercase tracking-tight">{t.name}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {Math.round(t.multiplier * 100)}% da parcela
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* PASSO 5 — SEGURO */}
      {step === 4 && (
        <Section title="Seguro prestamista">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              selected={!insurance}
              onClick={() => {
                setInsurance(false);
                setStep(5);
              }}
            >
              <div className="text-lg font-semibold">Não incluir</div>
              <p className="mt-2 text-sm text-muted-foreground">Parcela sem seguro prestamista.</p>
            </Card>
            <Card
              selected={insurance}
              onClick={() => {
                setInsurance(true);
                setStep(5);
              }}
            >
              <div className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-primary" /> Incluir
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {insuranceRule
                  ? `${formatPercent(insuranceRule.rate)} sobre o crédito + taxas.`
                  : "Seguro não configurado para este grupo."}
              </p>
            </Card>
          </div>
        </Section>
      )}

      {/* PASSO 6 — RESULTADO */}
      {step === 5 && result && group && range && rate && type && (
        <div className="space-y-6">
          <div className="surface overflow-hidden">
            <div className="border-b border-border px-4 py-5 sm:px-6">
              <h2 className="text-xl font-semibold">Simulação pronta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Valores calculados a partir das regras vigentes do grupo.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:gap-x-8 sm:px-6 lg:grid-cols-4">
              <Field label="Grupo" value={group.code} />
              <Field label="Crédito" value={formatBRL(range.credit_value)} />
              <Field label="Taxa de administração" value={formatPercent(rate.rate)} />
              <Field label="Fundo de reserva" value={formatPercent(group.reserve_fund)} />
              <Field label="Modalidade" value={type.name} />
              <Field label="Prazo inicial" value={`${group.initial_term} meses`} />
              <Field label="Prazo restante" value={`${group.remaining_term} meses`} />
              <Field label="Seguro" value={insurance ? "Incluído" : "Não incluído"} />
            </dl>
            <div className="border-t border-border bg-secondary/40 px-4 py-7 sm:px-6 sm:py-8">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Valor da parcela
              </div>
              <div className="mt-2 break-words text-3xl font-semibold tabular text-primary sm:text-5xl">
                {formatBRL(result.finalAmount)}
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <div>Parcela sem seguro: {formatBRL(result.installment)}</div>
                <div>
                  Seguro: {insurance ? formatBRL(result.insurance) : "Não incluído"}
                </div>
                <div className="font-medium text-foreground">
                  Total mensal: {formatBRL(result.finalAmount)}
                </div>
              </div>
            </div>
          </div>

          <div className="surface space-y-4 p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente">Nome do cliente (opcional)</Label>
                <Input
                  id="cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex.: Transportes Silva Ltda"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => void saveAndOpenProposal()} disabled={saving}>
                <FileText className="mr-1 h-4 w-4" />
                {saving ? "Gerando…" : "Gerar proposta"}
              </Button>
              <CompareDialog
                groupReserve={group.reserve_fund}
                initialTerm={group.initial_term}
                credit={range.credit_value}
                rates={config?.rates ?? []}
                types={config?.types ?? []}
                insuranceRate={insuranceRule?.rate ?? 0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`surface relative min-h-28 w-full p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] sm:p-5 ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      {selected && (
        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-medium tabular">{value}</dd>
    </div>
  );
}

function CompareDialog({
  credit,
  rates,
  types,
  groupReserve,
  initialTerm,
  insuranceRate,
}: {
  credit: number;
  rates: Array<{ id: string; rate: number }>;
  types: Array<{ id: string; name: string; multiplier: number }>;
  groupReserve: number;
  initialTerm: number;
  insuranceRate: number;
}) {
  const options = types.flatMap((t) =>
    rates.flatMap((r) =>
      [false, true].map((ins) => ({
        key: `${t.id}-${r.id}-${ins}`,
        type: t,
        rate: r,
        ins,
        result: calculate({
          credit,
          adminRate: r.rate,
          reserveFund: groupReserve,
          initialTerm,
          multiplier: t.multiplier,
          insuranceRate,
          insuranceIncluded: ins,
        }),
      })),
    ),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full sm:w-auto">
          <Layers className="mr-1 h-4 w-4" /> Comparar opções
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base sm:text-lg">Comparar opções · {formatBRL(credit)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o, i) => (
            <div key={o.key} className="rounded-xl border border-border p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Opção {i + 1}
              </div>
              <div className="mt-1 text-sm font-medium">{o.type.name}</div>
              <div className="text-sm text-muted-foreground">
                Taxa {formatPercent(o.rate.rate)} · {o.ins ? "Com seguro" : "Sem seguro"}
              </div>
              <div className="mt-3 text-2xl font-semibold tabular text-primary">
                {formatBRL(o.result.finalAmount)}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
