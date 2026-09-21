import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createSeller, resetSellerPassword, setSellerActive } from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";

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
  const resetPwd = useServerFn(resetSellerPassword);
  const toggle = useServerFn(setSellerActive);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const roleBy = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleBy.get(p.id) ?? "seller" }));
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["team"] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: form });
      toast.success("Vendedor criado. Envie a senha inicial com segurança.");
      setForm({ name: "", email: "", phone: "", password: "" });
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o vendedor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Minha equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendedores com acesso ao simulador. Somente administradores alteram regras.
          </p>
        </div>
        <Button onClick={() => setOpen(!open)}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar vendedor
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="surface grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <Label>Senha inicial</Label>
            <Input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={busy}>
              {busy ? "Criando…" : "Criar vendedor"}
            </Button>
          </div>
        </form>
      )}

      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">Telefone</th>
              <th className="px-5 py-3">Perfil</th>
              <th className="px-5 py-3">Desde</th>
              <th className="px-5 py-3">Ativo</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(team ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border/70">
                <td className="px-5 py-3">{p.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{p.email}</td>
                <td className="px-5 py-3">{p.phone || "—"}</td>
                <td className="px-5 py-3">{p.role === "admin" ? "Administrador" : "Vendedor"}</td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                <td className="px-5 py-3">
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
                <td className="px-5 py-3 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
