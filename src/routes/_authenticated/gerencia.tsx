import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Target, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/gerencia")({
  head: () => ({ meta: [
    { title: "Gerência de revenda — Randon Consórcios" },
    { name: "description", content: "Equipe e acompanhamento comercial da revenda sob sua gerência." },
    { property: "og:title", content: "Gerência de revenda — Randon Consórcios" },
    { property: "og:description", content: "Equipe, propostas e resultados exclusivos da sua revenda." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: DealerManagement,
});

type TeamPage = { total: number; entries: Array<{ id: string; name: string; email: string; phone: string | null; active: boolean; dealer: string }> };

function DealerManagement() {
  const { user, loading, isDealerManager, managedDealers } = useAuth();
  const [page, setPage] = useState(1);
  const team = useQuery({
    queryKey: ["dealer-manager-team", user?.id, page],
    enabled: isDealerManager,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dealer_manager_team", { _page: page });
      if (error) throw error;
      return data as unknown as TeamPage;
    },
  });
  if (loading) return <p role="status">Carregando…</p>;
  if (!isDealerManager) return <p role="alert" className="text-muted-foreground">Esta área é exclusiva dos gerentes de revenda.</p>;
  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-primary">Gerência de revenda</p><h1 className="mt-1 text-3xl font-semibold">{managedDealers.map(d => d.name).join(" · ")}</h1></header>
    <div className="flex flex-wrap gap-3"><Button variant="outline" asChild><Link to="/historico" search={{ page: 1, client: "", seller: "", from: "", to: "" }}><ClipboardList /> Propostas da equipe</Link></Button><Button asChild><Link to="/mauricio"><Target /> Resultados comerciais</Link></Button></div>
    <section className="space-y-4 border-t pt-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><Users className="h-5 w-5" /> Minha equipe</h2><Badge variant="secondary">{team.data?.total ?? 0} pessoas</Badge></div>
      {team.isPending ? <p role="status">Carregando equipe…</p> : team.isError ? <p role="alert" className="text-destructive">Não foi possível carregar a equipe.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="py-3">Vendedor</th><th className="p-3">Contato</th><th className="p-3">Status</th></tr></thead><tbody>{team.data?.entries.map(seller => <tr key={seller.id} className="border-b"><td className="py-4 font-medium">{seller.name}</td><td className="p-3"><div>{seller.email}</div>{seller.phone && <div className="text-muted-foreground">{seller.phone}</div>}</td><td className="p-3"><Badge variant={seller.active ? "secondary" : "outline"}>{seller.active ? "Ativo" : "Inativo"}</Badge></td></tr>)}</tbody></table></div>}
      {(team.data?.total ?? 0) > 20 && <nav className="flex items-center justify-center gap-3" aria-label="Paginação da equipe"><Button variant="outline" size="icon" disabled={page===1} onClick={() => setPage(p => p-1)} aria-label="Página anterior"><ChevronLeft /></Button><span>{page}</span><Button variant="outline" size="icon" disabled={page*20 >= (team.data?.total ?? 0)} onClick={() => setPage(p => p+1)} aria-label="Próxima página"><ChevronRight /></Button></nav>}
    </section>
  </div>;
}