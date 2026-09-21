import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGroupConfig, useGroups } from "@/hooks/useConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatBRL, formatPercent } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];
type InsuranceUpdate = Database["public"]["Tables"]["insurance_rules"]["Update"];

export const Route = createFileRoute("/_authenticated/admin/grupos")({
  head: () => ({
    meta: [
      { title: "Grupos e regras — Randon Consórcios" },
      { name: "description", content: "Cadastre grupos, faixas de crédito, taxas e seguro." },
      { property: "og:title", content: "Grupos e regras — Randon Consórcios" },
      {
        property: "og:description",
        content: "Cadastre grupos, faixas de crédito, taxas e seguro.",
      },
    ],
  }),
  component: AdminGrupos,
});

function AdminGrupos() {
  const qc = useQueryClient();
  const { data: groups } = useGroups(false);
  const [selected, setSelected] = useState<string | null>(null);
  const groupId = selected ?? groups?.[0]?.id ?? null;
  const group = (groups ?? []).find((g) => g.id === groupId) ?? null;
  const { data: config } = useGroupConfig(groupId, false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["groups"] });
    void qc.invalidateQueries({ queryKey: ["group-config"] });
  };

  const run = useMutation({
    mutationFn: async (fn: () => Promise<{ error: unknown }>) => {
      const { error } = await fn();
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Configuração atualizada.");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Grupos e regras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo que o motor de cálculo usa fica aqui — nada é fixo no sistema.
          </p>
        </div>
        <NewGroupDialog onDone={invalidate} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(groups ?? []).map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g.id)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              g.id === groupId ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
            }`}
          >
            {g.name}
            {!g.active && <span className="ml-2 text-xs text-muted-foreground">inativo</span>}
          </button>
        ))}
      </div>

      {group && (
        <>
          <section className="surface space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Dados do grupo
            </h2>
            <GroupForm
              key={group.id}
              group={group}
              onSave={(values) =>
                run.mutate(async () => supabase.from("groups").update(values).eq("id", group.id))
              }
            />
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Faixas de crédito
            </h2>
            <ul className="divide-y divide-border">
              {(config?.ranges ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="tabular">{formatBRL(r.credit_value)}</span>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) =>
                        run.mutate(async () =>
                          supabase.from("credit_ranges").update({ active: v }).eq("id", r.id),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        run.mutate(async () =>
                          supabase.from("credit_ranges").delete().eq("id", r.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <AddValue
              label="Novo crédito (R$)"
              onAdd={(v) =>
                run.mutate(async () =>
                  supabase.from("credit_ranges").insert({ group_id: group.id, credit_value: v }),
                )
              }
            />
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Taxas de administração
            </h2>
            <ul className="divide-y divide-border">
              {(config?.rates ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="tabular">{formatPercent(r.rate)}</span>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) =>
                        run.mutate(async () =>
                          supabase.from("administration_rates").update({ active: v }).eq("id", r.id),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        run.mutate(async () =>
                          supabase.from("administration_rates").delete().eq("id", r.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <AddValue
              label="Nova taxa (%)"
              onAdd={(v) =>
                run.mutate(async () =>
                  supabase
                    .from("administration_rates")
                    .insert({ group_id: group.id, rate: v / 100 }),
                )
              }
            />
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Modalidades de parcela
            </h2>
            <ul className="divide-y divide-border">
              {(config?.types ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                  <span>
                    {t.name} · multiplicador {t.multiplier.toString().replace(".", ",")}
                  </span>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={t.active}
                      onCheckedChange={(v) =>
                        run.mutate(async () =>
                          supabase.from("installment_types").update({ active: v }).eq("id", t.id),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        run.mutate(async () =>
                          supabase.from("installment_types").delete().eq("id", t.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <NewTypeForm
              onAdd={(name, multiplier) =>
                run.mutate(async () =>
                  supabase
                    .from("installment_types")
                    .insert({ group_id: group.id, name, multiplier }),
                )
              }
            />
          </section>

          <section className="surface space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Seguro
            </h2>
            {config?.insurance ? (
              <InsuranceForm
                key={config.insurance.id}
                rule={config.insurance}
                onSave={(values) =>
                  run.mutate(async () =>
                    supabase.from("insurance_rules").update(values).eq("id", config.insurance!.id),
                  )
                }
              />
            ) : (
              <AddValue
                label="Taxa do seguro (%)"
                onAdd={(v) =>
                  run.mutate(async () =>
                    supabase
                      .from("insurance_rules")
                      .insert({ group_id: group.id, rate: v / 100, name: "Seguro prestamista" }),
                  )
                }
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function GroupForm({
  group,
  onSave,
}: {
  group: {
    name: string;
    code: string;
    initial_term: number;
    remaining_term: number;
    reserve_fund: number;
    active: boolean;
  };
  onSave: (values: GroupUpdate) => void;
}) {
  const [form, setForm] = useState({
    name: group.name,
    code: group.code,
    initial_term: String(group.initial_term),
    remaining_term: String(group.remaining_term),
    reserve_fund: String(group.reserve_fund * 100),
    active: group.active,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field label="Código" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
      <Field
        label="Prazo inicial (meses)"
        value={form.initial_term}
        onChange={(v) => setForm({ ...form, initial_term: v })}
      />
      <Field
        label="Prazo restante (meses)"
        value={form.remaining_term}
        onChange={(v) => setForm({ ...form, remaining_term: v })}
      />
      <Field
        label="Fundo de reserva (%)"
        value={form.reserve_fund}
        onChange={(v) => setForm({ ...form, reserve_fund: v })}
      />
      <div className="flex items-center gap-3 pt-6">
        <Switch
          checked={form.active}
          onCheckedChange={(v) => setForm({ ...form, active: v })}
          id="ativo"
        />
        <Label htmlFor="ativo">Grupo ativo</Label>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button
          onClick={() =>
            onSave({
              name: form.name,
              code: form.code,
              initial_term: Number(form.initial_term),
              remaining_term: Number(form.remaining_term),
              reserve_fund: Number(form.reserve_fund.replace(",", ".")) / 100,
              active: form.active,
            })
          }
        >
          Salvar grupo
        </Button>
      </div>
    </div>
  );
}

function InsuranceForm({
  rule,
  onSave,
}: {
  rule: { name: string; rate: number; active: boolean };
  onSave: (values: InsuranceUpdate) => void;
}) {
  const [name, setName] = useState(rule.name);
  const [rate, setRate] = useState(String(rule.rate * 100));
  const [active, setActive] = useState(rule.active);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Nome" value={name} onChange={setName} />
      <Field label="Taxa (%)" value={rate} onChange={setRate} />
      <div className="flex items-center gap-3 pt-6">
        <Switch checked={active} onCheckedChange={setActive} id="seg" />
        <Label htmlFor="seg">Seguro disponível</Label>
      </div>
      <div className="sm:col-span-3">
        <Button
          onClick={() =>
            onSave({ name, rate: Number(rate.replace(",", ".")) / 100, active })
          }
        >
          Salvar seguro
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AddValue({ label, onAdd }: { label: string; onAdd: (value: number) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-52" />
      </div>
      <Button
        variant="outline"
        onClick={() => {
          const n = Number(value.replace(/\./g, "").replace(",", "."));
          if (!Number.isFinite(n) || n <= 0) {
            toast.error("Informe um valor válido.");
            return;
          }
          onAdd(n);
          setValue("");
        }}
      >
        <Plus className="mr-1 h-4 w-4" /> Adicionar
      </Button>
    </div>
  );
}

function NewTypeForm({ onAdd }: { onAdd: (name: string, multiplier: number) => void }) {
  const [name, setName] = useState("");
  const [mult, setMult] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-52" />
      </div>
      <div className="space-y-2">
        <Label>Multiplicador</Label>
        <Input
          value={mult}
          onChange={(e) => setMult(e.target.value)}
          className="w-36"
          placeholder="0,40"
        />
      </div>
      <Button
        variant="outline"
        onClick={() => {
          const n = Number(mult.replace(",", "."));
          if (!name || !Number.isFinite(n) || n <= 0) {
            toast.error("Informe nome e multiplicador.");
            return;
          }
          onAdd(name, n);
          setName("");
          setMult("");
        }}
      >
        <Plus className="mr-1 h-4 w-4" /> Adicionar
      </Button>
    </div>
  );
}

function NewGroupDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    initial_term: "100",
    remaining_term: "",
    reserve_fund: "1",
  });

  async function save() {
    const { error } = await supabase.from("groups").insert({
      name: form.name,
      code: form.code,
      initial_term: Number(form.initial_term),
      remaining_term: Number(form.remaining_term),
      reserve_fund: Number(form.reserve_fund.replace(",", ".")) / 100,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Grupo criado.");
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Novo grupo
      </Button>
    );
  }

  return (
    <div className="surface w-full space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Código" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
        <Field
          label="Prazo inicial"
          value={form.initial_term}
          onChange={(v) => setForm({ ...form, initial_term: v })}
        />
        <Field
          label="Prazo restante"
          value={form.remaining_term}
          onChange={(v) => setForm({ ...form, remaining_term: v })}
        />
        <Field
          label="Fundo de reserva (%)"
          value={form.reserve_fund}
          onChange={(v) => setForm({ ...form, reserve_fund: v })}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => void save()}>Criar grupo</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
