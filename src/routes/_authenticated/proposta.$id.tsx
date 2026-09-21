import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import graneleiro from "@/assets/graneleiro.jpg.asset.json";
import frigorifico from "@/assets/frigorifico.jpg.asset.json";
import furgao from "@/assets/furgao.jpg.asset.json";
import sider from "@/assets/sider.jpg.asset.json";

const proposalImages = [graneleiro, frigorifico, furgao, sider];

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
  const imageIndex = [...sim.id].reduce((total, char) => total + char.charCodeAt(0), 0) % proposalImages.length;
  const proposalImage = proposalImages[imageIndex];

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

      <article className="proposal-sheet surface mx-auto max-w-4xl overflow-hidden">
        <div className="relative min-h-72 overflow-hidden">
          <img
            src={proposalImage.url}
            alt="Implemento rodoviário Randon"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="proposal-cover-shade absolute inset-0" />
          <header className="relative flex min-h-72 flex-col justify-between p-8 text-primary-foreground sm:p-10">
            <Brand variant="dark" />
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">
                  Simulação de consórcio
                </p>
                <h1 className="mt-2 max-w-xl text-3xl font-semibold sm:text-4xl">
                  O próximo passo para movimentar o seu negócio.
                </h1>
              </div>
              <div className="text-right text-xs text-primary-foreground/80">
                Proposta personalizada
                <div>{formatDate(sim.created_at)}</div>
              </div>
            </div>
          </header>
        </div>

        <div className="px-8 py-8 sm:px-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Preparada para
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {sim.client_name || "Cliente Randon"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Crédito contratado
              </div>
              <div className="mt-1 text-2xl font-semibold text-primary">
                {formatBRL(Number(sim.credit_value))}
              </div>
            </div>
          </div>

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <Item label="Grupo" value={sim.group_code} />
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
            <Item label="Seguro" value={sim.insurance_included ? "Incluído" : "Não incluído"} />
          </dl>

          <div className="proposal-highlight mt-8 rounded-lg p-7 text-primary-foreground">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              Investimento mensal
            </div>
            <div className="mt-2 text-5xl font-semibold tabular">
              {formatBRL(Number(sim.final_amount))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm text-primary-foreground/75">
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
            <p className="max-w-sm text-right text-xs leading-relaxed text-muted-foreground">
              Esta simulação é informativa. Valores sujeitos às condições, disponibilidade e regras
              vigentes do grupo.
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
