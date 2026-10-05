import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, CreditCard, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  chargeSellerLicense,
  createSeller,
  deleteSeller,
  resetSellerPassword,
  setSellerActive,
  updateSeller,
} from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";
import { useDealers } from "@/hooks/useConfig";
import { DealerAccessPicker } from "@/components/DealerAccessPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  active: boolean;
  created_at: string;
  dealer_id: string | null;
  role: "admin" | "seller";
};

const NO_DEALER = "none";

export const Route = createFileRoute("/_authenticated/admin/equipe")({
  head: () => ({
    meta: [
      { title: "Minha equipe — Randon Consórcios" },
      { name: "description", content: "Gerencie os vendedores com acesso ao simulador." },
      { property: "og:title", content: "Minha equipe — Randon Consórcios" },
      { property: "og:description", content: "Gerencie os vendedores com acesso ao simulador." },
    ],
  }),
  component: AdminEquipe,
});

function AdminEquipe() {
  const qc = useQueryClient();
  const create = useServerFn(createSeller);
  const update = useServerFn(updateSeller);
  const remove = useServerFn(deleteSeller);
  const resetPwd = useServerFn(resetSellerPassword);
  const toggle = useServerFn(setSellerActive);
  const chargeLicense = useServerFn(chargeSellerLicense);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", password: "", dealerId: NO_DEALER });
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", cpf: "", dealerId: NO_DEALER });
  const [editBusy, setEditBusy] = useState(false);
  const [chargingId, setChargingId] = useState<string | null>(null);
  const { data: dealers } = useDealers();

  function startEdit(member: TeamMember) {
    setEditing(member);
    setEditForm({
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      cpf: member.cpf ?? "",
      dealerId: member.dealer_id ?? NO_DEALER,
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditBusy(true);
    try {
      await update({
        data: {
          userId: editing.id,
          ...editForm,
          dealerId: editForm.dealerId === NO_DEALER ? null : editForm.dealerId,
        },
      });
      toast.success("Vendedor atualizado.");
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o vendedor.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleChargeLicense(member: TeamMember) {
    setChargingId(member.id);
    try {
      const { invoiceUrl } = await chargeLicense({ data: { userId: member.id } });
      await navigator.clipboard.writeText(invoiceUrl).catch(() => undefined);
      toast.success("Cobrança gerada e link copiado — envie para o vendedor.", {
        action: {
          label: "Copiar de novo",
          onClick: () => void navigator.clipboard.writeText(invoiceUrl),
        },
      });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a cobrança.");
    } finally {
      setChargingId(null);
    }
  }

  async function handleDelete(member: TeamMember) {
    try {
      await remove({ data: { userId: member.id } });
      toast.success("Vendedor excluído.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o vendedor.");
    }
  }

  async function copyPassword() {
    if (!form.password) return;
    try {
      await navigator.clipboard.writeText(form.password.trim());
      toast.success("Senha copiada. Envie exatamente esse texto ao vendedor.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o campo manualmente.");
    }
  }

  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const roleBy = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleBy.get(p.id) ?? "seller" })) as TeamMember[];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["team"] });

  const { data: extraDealerIds } = useQuery({
    queryKey: ["seller-extra-dealers", editing?.id],
    enabled: !!editing,
    queryFn: async () => {
      if (!editing) return new Set<string>();
      const { data, error } = await supabase
        .from("seller_dealers")
        .select("dealer_id")
        .eq("seller_id", editing.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.dealer_id));
    },
  });

  async function toggleExtraDealer(dealerId: string, selected: boolean) {
    if (!editing) return;
    const { error } = selected
      ? await supabase.from("seller_dealers").insert({ seller_id: editing.id, dealer_id: dealerId })
      : await supabase.from("seller_dealers").delete().eq("seller_id", editing.id).eq("dealer_id", dealerId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["seller-extra-dealers", editing.id] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: { ...form, dealerId: form.dealerId === NO_DEALER ? null : form.dealerId },
      });
      toast.success("Vendedor criado. Envie a senha inicial com segurança.");
      setForm({ name: "", email: "", phone: "", cpf: "", password: "", dealerId: NO_DEALER });
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o vendedor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">Minha equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendedores com acesso ao simulador. Somente administradores alteram regras.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(!open)}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar vendedor
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="surface grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>CPF (opcional)</Label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
            <p className="text-xs text-muted-foreground">Só é necessário se for cobrar licença dele depois.</p>
          </div>
          <div className="space-y-2">
            <Label>Revenda</Label>
            <Select value={form.dealerId} onValueChange={(v) => setForm({ ...form, dealerId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sem revenda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DEALER}>Sem revenda</SelectItem>
                {(dealers ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Senha inicial</Label>
            <div className="flex gap-2">
              <Input
                type={showPassword ? "text" : "password"}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyPassword}
                aria-label="Copiar senha"
              >
                <Copy />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copie e envie exatamente este texto ao vendedor — evite retranscrever a senha manualmente.
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              {busy ? "Criando…" : "Criar vendedor"}
            </Button>
          </div>
        </form>
      )}

      <div className="sm:surface sm:overflow-x-auto">
        <table className="mobile-card-table w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">Telefone</th>
              <th className="px-5 py-3">Revenda</th>
              <th className="px-5 py-3">Perfil</th>
              <th className="px-5 py-3">Desde</th>
              <th className="px-5 py-3">Ativo</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(team ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border/70">
                <td data-label="Nome" className="px-5 py-3">{p.name}</td>
                <td data-label="E-mail" className="px-5 py-3 text-muted-foreground">{p.email}</td>
                <td data-label="Telefone" className="px-5 py-3">{p.phone || "—"}</td>
                <td data-label="Revenda" className="px-5 py-3 text-muted-foreground">
                  {(dealers ?? []).find((d) => d.id === p.dealer_id)?.name ?? "—"}
                </td>
                <td data-label="Perfil" className="px-5 py-3">{p.role === "admin" ? "Administrador" : "Vendedor"}</td>
                <td data-label="Desde" className="px-5 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                <td data-label="Ativo" className="px-5 py-3">
                  <Switch
                    checked={p.active}
                    disabled={p.role === "admin"}
                    onCheckedChange={async (v) => {
                      try {
                        await toggle({ data: { userId: p.id, active: v } });
                        refresh();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Falha ao atualizar.");
                      }
                    }}
                  />
                </td>
                <td data-label="Ação" className="px-5 py-3">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const pwd = window.prompt("Nova senha (mínimo 8 caracteres)");
                        if (!pwd || pwd.length < 8) return;
                        try {
                          await resetPwd({ data: { userId: p.id, password: pwd } });
                          toast.success("Senha redefinida.");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Falha ao redefinir.");
                        }
                      }}
                    >
                      <KeyRound className="mr-1 h-4 w-4" /> Resetar senha
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => startEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {p.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={chargingId === p.id}
                        onClick={() => void handleChargeLicense(p)}
                      >
                        <CreditCard className="mr-1 h-4 w-4" />
                        {chargingId === p.id ? "Gerando…" : "Cobrar licença"}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          disabled={p.role === "admin"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir {p.name || p.email}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O login desse vendedor será removido definitivamente. Se ele tiver
                            simulações ou propostas registradas, a exclusão será bloqueada — use
                            "Desativar" nesse caso para revogar o acesso sem perder o histórico.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void handleDelete(p)}>
                            Excluir definitivamente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar vendedor</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF (opcional)</Label>
              <Input
                value={editForm.cpf}
                onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Revenda</Label>
              <Select
                value={editForm.dealerId}
                onValueChange={(v) => setEditForm({ ...editForm, dealerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem revenda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEALER}>Sem revenda</SelectItem>
                  {(dealers ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Revendas extras liberadas</Label>
              <p className="text-xs text-muted-foreground">
                Além da revenda principal acima — use para quem precisa enxergar grupos/taxas de
                outra revenda também (ex.: consultor atendendo mais de uma).
              </p>
              <DealerAccessPicker
                dealers={dealers ?? []}
                selectedIds={extraDealerIds ?? new Set()}
                onToggle={toggleExtraDealer}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editBusy}>
                {editBusy ? "Salvando…" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
