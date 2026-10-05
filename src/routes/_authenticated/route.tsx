import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateLicenseCharge } from "@/lib/license.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, licenseBlocked, license, signOut } = useAuth();

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (licenseBlocked) return <LicenseGate expired={license?.status === "active"} onSignOut={signOut} />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LicenseGate({ expired, onSignOut }: { expired: boolean; onSignOut: () => void }) {
  const generate = useServerFn(generateLicenseCharge);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { invoiceUrl } = await generate({});
      window.location.href = invoiceUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a cobrança.");
      setGenerating(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="surface w-full max-w-md space-y-4 p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold">
          {expired ? "Sua licença venceu" : "Finalize o pagamento da sua licença"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {expired
            ? "Sua licença anual expirou. Renove agora para continuar usando o simulador."
            : "Seu cadastro foi criado, mas o pagamento da licença anual ainda não foi confirmado."}
        </p>
        <Button className="w-full" onClick={() => void handleGenerate()} disabled={generating}>
          {generating ? "Gerando cobrança…" : expired ? "Renovar agora" : "Pagar agora"}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => void onSignOut()}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
