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

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
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

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h2 className="text-2xl font-semibold">
            Acessar plataforma
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use o e-mail corporativo cadastrado.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
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
              <Label htmlFor="password">Senha</Label>
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

          <p className="mt-6 text-sm text-muted-foreground">
            O acesso é criado pelo administrador da equipe.
          </p>

          <p className="mt-10 text-xs text-muted-foreground">
            Ferramenta interna de simulação · Randon Consórcios / Rands
          </p>
        </div>
      </div>
    </div>
  );
}
