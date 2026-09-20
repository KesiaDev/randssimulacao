import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/proposta/$id")({
  head: () => ({
    meta: [
      { title: "Proposta de consórcio — Randon Consórcios" },
      { name: "description", content: "Resumo profissional da simulação para envio ao cliente." },
      { property: "og:title", content: "Proposta de consórcio — Randon Consórcios" },
      {
        property: "og:description",
        content: "Resumo profissional da simulação para envio ao cliente.",
      },
    ],
  }),
  component: Proposta,
});

function Proposta() {
  const { id } = useParams({ from: "/_authenticated/proposta/$id" });

  const { data, isLoading } = useQuery({
    queryKey: ["simulation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: seller } = await supabase
        .from("profiles")
        .select("name, email, phone")
        .eq("id", data.seller_id)
        .maybeSingle();
      return { sim: data, seller };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando proposta…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Simulação não encontrada.</p>;

  const { sim, seller } = data;

  const text = [
    "Randon Consórcios / Rands — Simulação",
    sim.client_name ? `Cliente: ${sim.client_name}` : null,
    `Grupo: ${sim.group_code}`,
    `Crédito: ${formatBRL(Number(sim.credit_value))}`,
    `Prazo: ${sim.initial_term} meses (${sim.remaining_term} restantes)`,
    `Taxa de administração: ${formatPercent(Number(sim.administration_rate))}`,
    `Fundo de reserva: ${formatPercent(Number(sim.reserve_fund))}`,
    `Modalidade: ${sim.installment_type_name}`,
    `Seguro: ${sim.insurance_included ? formatBRL(Number(sim.insurance_amount)) : "Não incluído"}`,
    `Parcela final: ${formatBRL(Number(sim.final_amount))}`,
    seller?.name ? `Consultor: ${seller.name}` : null,
    `Data: ${formatDate(sim.created_at)}`,
    "Valores sujeitos às condições e regras vigentes do grupo.",
  ]
    .filter(Boolean)
    .join("\n");

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Simulação Randon Consórcios", text });
        return;
      } catch {
        /* usuário cancelou */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Resumo copiado. Cole no WhatsApp do cliente.");
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void share()}>
            <Share2 className="mr-1 h-4 w-4" /> Compartilhar
          </Button>
          <Button onClick={() => window.print()}>
            <Download className="mr-1 h-4 w-4" /> Baixar PDF
          </Button>
        </div>
      </div>

      <article className="surface mx-auto max-w-3xl overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-8 py-6">
          <Brand />
          <div className="text-right text-xs text-muted-foreground">
            Proposta de simulação
            <div>{formatDate(sim.created_at)}</div>
          </div>
        </header>

        <div className="px-8 py-8">
          {sim.client_name && (
            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Cliente
              </div>
              <div className="text-xl font-semibold">{sim.client_name}</div>
            </div>
          )}

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <Item label="Grupo" value={sim.group_code} />
            <Item label="Crédito" value={formatBRL(Number(sim.credit_value))} />
            <Item
              label="Prazo"
              value={`${sim.initial_term} meses · ${sim.remaining_term} restantes`}
            />
            <Item
              label="Taxa de administração"
              value={formatPercent(Number(sim.administration_rate))}
            />
            <Item label="Fundo de reserva" value={formatPercent(Number(sim.reserve_fund))} />
            <Item label="Modalidade" value={sim.installment_type_name} />
          </dl>

          <div className="mt-8 rounded-xl bg-secondary/50 p-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Parcela mensal
            </div>
            <div className="mt-1 text-4xl font-semibold tabular text-primary">
              {formatBRL(Number(sim.final_amount))}
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div>Parcela: {formatBRL(Number(sim.installment_amount))}</div>
              <div>
                Seguro:{" "}
                {sim.insurance_included
                  ? formatBRL(Number(sim.insurance_amount))
                  : "Não incluído"}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Consultor
              </div>
              <div className="font-medium">{seller?.name || seller?.email || "—"}</div>
              {seller?.phone && <div className="text-muted-foreground">{seller.phone}</div>}
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              Valores sujeitos às condições e regras vigentes do grupo. Ferramenta interna de
              simulação.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-medium tabular">{value}</dd>
    </div>
  );
}
