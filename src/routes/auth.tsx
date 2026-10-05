import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso — Simulador Randon Consórcios" },
      { name: "description", content: "Área restrita da equipe comercial da Randon Consórcios." },
      { property: "og:title", content: "Acesso — Simulador Randon Consórcios" },
      {
        property: "og:description",
        content: "Área restrita da equipe comercial da Randon Consórcios.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      if (error) throw error;
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRecoveryEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Digite seu e-mail para receber o link de redefinição.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
      setRecovering(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o e-mail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <Brand variant="dark" />
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight text-sidebar-foreground">
            Simulação de consórcios Randon
          </h1>
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
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {recovering ? "Redefinir senha" : "Acessar plataforma"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {recovering
              ? "Informe seu e-mail e enviaremos um link para criar uma nova senha."
              : "Use o e-mail corporativo cadastrado."}
          </p>

          {recovering ? (
            <div className="mt-7 space-y-4 sm:mt-8">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">E-mail</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={() => void sendRecoveryEmail()}>
                {busy ? "Enviando…" : "Enviar link de redefinição"}
              </Button>
              <button
                type="button"
                className="block text-sm font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setRecovering(false)}
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4 sm:mt-8">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => setRecovering(true)}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Aguarde…" : "Entrar"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            O acesso é criado pelo administrador da equipe ou pelo{" "}
            <a href="/cadastro" className="font-medium text-primary underline-offset-2 hover:underline">
              cadastro
            </a>
            .
          </p>

          <div className="mt-10 space-y-1.5 text-xs text-muted-foreground">
            <p>Ferramenta interna de simulação · Randon Consórcios / Rands</p>
            <p className="text-muted-foreground/70">
              Desenvolvido por <span className="font-semibold text-muted-foreground">NandiDev</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
