import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador de Consórcios — Randon Consórcios" },
      {
        name: "description",
        content:
          "Acesse o simulador interno de consórcios da Randon Consórcios e monte propostas em poucos passos.",
      },
      { property: "og:title", content: "Simulador de Consórcios — Randon Consórcios" },
      {
        property: "og:description",
        content: "Plataforma interna de simulação de consórcios da Randon Consórcios / Rands.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    void navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Brand />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}
