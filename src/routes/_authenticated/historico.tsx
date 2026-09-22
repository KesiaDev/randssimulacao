import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useConfig";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatDateTime, formatPercent } from "@/lib/format";
import { ChevronLeft, ChevronRight, Eye, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 10;

type HistorySearch = {
  page: number;
  group: string;
  seller: string;
  date: string;
  credit: string;
};

type ProposalItem = {
  quantity: number;
  group_code: string;
  credit_value: number;
  final_amount: number;
  simulation_id: string | null;
};

type ProposalEntry = {
  kind: "proposal";
  id: string;
  seller_id: string;
  seller_name: string;
  client_name: string | null;
  created_at: string;
  items: ProposalItem[];
};

type SimulationEntry = {
  kind: "simulation";
  id: string;
  seller_id: string;
  seller_name: string;
  client_name: string | null;
  created_at: string;
  group_code: string;
  credit_value: number;
  administration_rate: number;
  installment_type_name: string;
  insurance_included: boolean;
  final_amount: number;
};

type HistoryEntry = ProposalEntry | SimulationEntry;

type HistoryPage = {
  total: number;
  entries: HistoryEntry[];
};

export const Route = createFileRoute("/_authenticated/historico")({
  validateSearch: (search): HistorySearch => ({
    page: Math.max(1, Number(search["page"]) || 1),
    group: typeof search["group"] === "string" ? search["group"] : "",
    seller: typeof search["seller"] === "string" ? search["seller"] : "",
    date: typeof search["date"] === "string" ? search["date"] : "",
    credit: typeof search["credit"] === "string" ? search["credit"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Histórico de simulações — Randon Consórcios" },
      { name: "description", content: "Busque e filtre simulações realizadas pela equipe." },
      { property: "og:title", content: "Histórico de simulações — Randon Consórcios" },
      { property: "og:description", content: "Busque e filtre simulações realizadas pela equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Historico,
});

function Historico() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { isAdmin } = useAuth();
  const { data: groups } = useGroups(false);

  const { data, isFetching } = useQuery({
    queryKey: ["history-page", search],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_history_page", {
        _page: search.page,
        _page_size: PAGE_SIZE,
        _group: search.group || undefined,
        _seller: search.seller || undefined,
        _date: search.date || undefined,
        _credit: search.credit || undefined,
      });
      if (error) throw error;
      return data as unknown as HistoryPage;
    },
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const proposals = entries.filter((entry): entry is ProposalEntry => entry.kind === "proposal");
  const simulations = entries.filter((entry): entry is SimulationEntry => entry.kind === "simulation");

  function updateFilter(key: Exclude<keyof HistorySearch, "page">, value: string) {
    void navigate({
      search: (previous) => ({ ...previous, [key]: value, page: 1 }),
      replace: true,
    });
  }

  function goToPage(page: number) {
    void navigate({ search: (previous) => ({ ...previous, page }) });
  }

  async function deleteProposal(id: string) {
    const { error } = await supabase.rpc("delete_saved_proposal", { _proposal_id: id });
    if (error) {
      toast.error("Não foi possível excluir a proposta.");
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["history-page"] }),
      queryClient.invalidateQueries({ queryKey: ["my-proposals"] }),
      queryClient.invalidateQueries({ queryKey: ["my-simulations"] }),
    ]);
    toast.success("Proposta excluída.");
  }

  async function deleteLegacySimulation(id: string) {
    const { error } = await supabase.rpc("delete_legacy_simulation", { _simulation_id: id });
    if (error) {
      toast.error("Não foi possível excluir a simulação.");
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["history-page"] }),
      queryClient.invalidateQueries({ queryKey: ["my-simulations"] }),
    ]);
    toast.success("Simulação excluída.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Histórico de simulações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? "Todas as simulações da equipe." : "Suas simulações."}
        </p>
      </div>

      <div className="surface grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Grupo</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={search.group}
            onChange={(event) => updateFilter("group", event.target.value)}
          >
            <option value="">Todos</option>
            {(groups ?? []).map((group) => (
              <option key={group.id} value={group.code}>{group.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Vendedor</Label>
          <Input
            value={search.seller}
            onChange={(event) => updateFilter("seller", event.target.value)}
            placeholder="Nome do vendedor"
          />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={search.date} onChange={(event) => updateFilter("date", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Faixa de crédito</Label>
          <Input
            value={search.credit}
            onChange={(event) => updateFilter("credit", event.target.value)}
            placeholder="293305"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{total === 1 ? "1 resultado" : `${total} resultados`}</span>
        {isFetching && <span>Atualizando…</span>}
      </div>

      {proposals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Propostas compostas</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {proposals.map((proposal) => {
              const quantity = proposal.items.reduce((sum, item) => sum + item.quantity, 0);
              const creditTotal = proposal.items.reduce((sum, item) => sum + Number(item.credit_value) * item.quantity, 0);
              const monthlyTotal = proposal.items.reduce((sum, item) => sum + Number(item.final_amount) * item.quantity, 0);
              return (
                <article key={proposal.id} className="surface p-4 transition-colors hover:border-primary/40 sm:p-5">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{proposal.client_name || "Cliente Randon"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(proposal.created_at)} · {proposal.seller_name}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-primary">
                      {quantity} {quantity === 1 ? "cota" : "cotas"}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div><div className="text-xs text-muted-foreground">Crédito total</div><div className="font-medium tabular">{formatBRL(creditTotal)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Parcela total/mês</div><div className="font-medium tabular">{formatBRL(monthlyTotal)}</div></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" asChild><Link to="/proposta/$id" params={{ id: proposal.id }}><Eye /> Abrir</Link></Button>
                    <Button variant="outline" size="sm" asChild><Link to="/simular" search={{ edit: proposal.id, legacy: undefined }}><Pencil /> Editar</Link></Button>
                    <DeleteConfirm title="Excluir esta proposta?" description="A proposta, seus itens e as simulações vinculadas serão removidos definitivamente." onConfirm={() => void deleteProposal(proposal.id)} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {simulations.length > 0 && (
        <div className="sm:surface sm:overflow-x-auto">
          <table className="mobile-card-table w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Data</th><th className="px-5 py-3">Vendedor</th><th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Grupo</th><th className="px-5 py-3">Crédito</th><th className="px-5 py-3">Taxa</th>
                <th className="px-5 py-3">Modalidade</th><th className="px-5 py-3">Seguro</th><th className="px-5 py-3">Parcela final</th><th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {simulations.map((simulation) => (
                <tr key={simulation.id} className="border-t border-border/70">
                  <td data-label="Data" className="px-5 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(simulation.created_at)}</td>
                  <td data-label="Vendedor" className="px-5 py-3">{simulation.seller_name}</td>
                  <td data-label="Cliente" className="px-5 py-3">{simulation.client_name || "—"}</td>
                  <td data-label="Grupo" className="px-5 py-3">{simulation.group_code}</td>
                  <td data-label="Crédito" className="px-5 py-3 tabular">{formatBRL(Number(simulation.credit_value))}</td>
                  <td data-label="Taxa" className="px-5 py-3 tabular">{formatPercent(Number(simulation.administration_rate))}</td>
                  <td data-label="Modalidade" className="px-5 py-3">{simulation.installment_type_name}</td>
                  <td data-label="Seguro" className="px-5 py-3">{simulation.insurance_included ? "Incluído" : "Não"}</td>
                  <td data-label="Parcela final" className="px-5 py-3 font-medium tabular">{formatBRL(Number(simulation.final_amount))}</td>
                  <td data-label="Ação" className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild><Link to="/proposta/$id" params={{ id: simulation.id }} aria-label="Abrir simulação"><Eye /></Link></Button>
                      <Button variant="ghost" size="icon" asChild><Link to="/simular" search={{ edit: undefined, legacy: simulation.id }} aria-label="Editar simulação"><Pencil /></Link></Button>
                      <DeleteConfirm iconOnly title="Excluir esta simulação?" description="Esta simulação antiga será removida definitivamente." onConfirm={() => void deleteLegacySimulation(simulation.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length === 0 && (
        <div className="surface px-5 py-10 text-center text-sm text-muted-foreground">
          Nenhuma simulação encontrada com os filtros atuais.
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginação do histórico" className="flex flex-wrap items-center justify-center gap-1">
          <Button variant="ghost" size="icon" disabled={search.page <= 1} onClick={() => goToPage(search.page - 1)} aria-label="Página anterior"><ChevronLeft /></Button>
          {paginationPages(search.page, totalPages).map((page, index) => page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-muted-foreground" aria-hidden>…</span>
          ) : (
            <Button key={page} variant={page === search.page ? "outline" : "ghost"} size="icon" onClick={() => goToPage(page)} aria-label={`Página ${page}`} aria-current={page === search.page ? "page" : undefined}>{page}</Button>
          ))}
          <Button variant="ghost" size="icon" disabled={search.page >= totalPages} onClick={() => goToPage(search.page + 1)} aria-label="Próxima página"><ChevronRight /></Button>
        </nav>
      )}
    </div>
  );
}

function paginationPages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: Array<number | "ellipsis"> = [1];
  if (current > 4) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (current < total - 3) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function DeleteConfirm({ title, description, onConfirm, iconOnly = false }: { title: string; description: string; onConfirm: () => void; iconOnly?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline" size={iconOnly ? "icon" : "sm"} aria-label="Excluir"><Trash2 />{!iconOnly && " Excluir"}</Button></AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}