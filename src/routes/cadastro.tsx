import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { useDealers } from "@/hooks/useConfig";
import { registerSeller } from "@/lib/register.functions";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — Simulador Randon Consórcios" },
      { name: "description", content: "Cadastro de vendedor com licença anual da plataforma." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const navigate = useNavigate();
  const { data: dealers } = useDealers();
  const register = useServerFn(registerSeller);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", dealerId: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dealerId) {
      toast.error("Selecione sua revenda.");
      return;
    }
    setBusy(true);
    try {
      const { invoiceUrl } = await register({ data: form });
      toast.success("Conta criada! Redirecionando para o pagamento da licença…");
      window.location.href = invoiceUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar sua conta.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <Brand variant="dark" />
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight text-sidebar-foreground">
            Crie sua conta e comece a simular na hora.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/70">
            Licença anual de R$ 500, parcelada em até 12x sem juros no cartão de crédito.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
          <ShieldCheck className="h-4 w-4" /> Ferramenta interna de simulação
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-8 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Criar minha conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Licença anual de R$ 500 em até 12x sem juros no cartão.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4 sm:mt-8">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Revenda</Label>
              <Select value={form.dealerId} onValueChange={(v) => setForm({ ...form, dealerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua revenda" />
                </SelectTrigger>
                <SelectContent>
                  {(dealers ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Criando conta…" : "Criar conta e pagar a licença"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Já tem conta?{" "}
            <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => void navigate({ to: "/auth" })}>
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
