import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useDealers } from "@/hooks/useConfig";
import { registerSeller } from "@/lib/register.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    dealerId: "",
    password: "",
    confirmPassword: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dealerId) {
      toast.error("Selecione sua revenda.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem.");
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
    <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold sm:text-3xl">Criar minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Licença anual de R$ 500 em até 12x sem juros no cartão.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4 sm:mt-8">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
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
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
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
            <div className="flex gap-2">
              <Input
                id="password"
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
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Criando conta…" : "Criar conta e pagar a licença"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Já tem conta?{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => void navigate({ to: "/auth" })}
          >
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
