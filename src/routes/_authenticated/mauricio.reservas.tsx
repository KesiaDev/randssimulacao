import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { reservaStatusEfetivo, STATUS_LABEL, STATUS_BADGE, type ReservaStatus } from "@/lib/mauricio";
import { syncReservaNotifications } from "@/lib/mauricio.functions";
import { useCommercialAccess } from "@/hooks/useCommercialAccess";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mauricio/reservas")({
  head: () => ({ meta: [
    { title: "Reservas de Cotas — Randon Gestão Comercial" },
    { name: "description", content: "Reservas de cotas Randon por grupo, revenda e status, com acompanhamento de validade." },
    { property: "og:title", content: "Reservas de Cotas — Randon Gestão Comercial" },
    { property: "og:description", content: "Acompanhe as reservas de cotas Randon por grupo, revenda, status e validade." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReservasPage,
});

interface Reserva {
  id: string;
  grupo: number;
  cota: number;
  vendedor: string | null;
  revenda: string;
  validade: string;
  obs: string | null;
  status: string;
}

function ReservasPage() {
  const qc = useQueryClient();
  const { dealers, user, isMauricio } = useCommercialAccess();
  const syncFn = useServerFn(syncReservaNotifications);
  const [busca, setBusca] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroRevenda, setFiltroRevenda] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({ grupo: "", cota: "", vendedor: "", revenda: "Multieixo", validade: "", obs: "" });

  const { data: reservas } = useQuery({
    queryKey: ["m-reservas-todas", user?.id],
    queryFn: async () =>
      (await supabase.from("mauricio_reservas").select("*").order("validade")).data ?? [],
  });

  const lista = useMemo(
    () =>
      ((reservas ?? []) as Reserva[]).map((r) => ({
        ...r,
        efetivo: reservaStatusEfetivo(r.status, r.validade),
      })),
    [reservas],
  );

  const grupos = useMemo(
    () => [...new Set(lista.map((r) => r.grupo))].sort((a, b) => a - b),
    [lista],
  );

  const filtradas = lista.filter((r) => {
    if (filtroGrupo !== "todos" && String(r.grupo) !== filtroGrupo) return false;
    if (busca && !`${r.grupo} ${r.cota} ${r.vendedor ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroRevenda !== "todas" && r.revenda !== filtroRevenda) return false;
    if (filtroStatus !== "todos" && r.efetivo !== filtroStatus) return false;
    return true;
  });

  const contagem = (s: ReservaStatus) => lista.filter((r) => r.efetivo === s).length;

  async function salvar() {
    const payload = {
      grupo: Number(form.grupo),
      cota: Number(form.cota),
      vendedor: form.vendedor.trim() || null,
      revenda: form.revenda,
      validade: form.validade,
      obs: form.obs.trim() || null,
    };
    if (!payload.grupo || !payload.cota || !payload.validade || !dealers.includes(payload.revenda)) {
      toast.error("Preencha grupo, cota e validade");
      return;
    }
    const { error } = editando
      ? await supabase.from("mauricio_reservas").update(payload).eq("id", editando.id)
      : await supabase.from("mauricio_reservas").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editando ? "Reserva atualizada" : "Reserva criada");
      setCriando(false);
      setEditando(null);
      setForm({ grupo: "", cota: "", vendedor: "", revenda: "Multieixo", validade: "", obs: "" });
      void qc.invalidateQueries({ queryKey: ["m-reservas"] });
      void qc.invalidateQueries({ queryKey: ["m-reservas-todas"] });
      void qc.invalidateQueries({ queryKey: ["m-rev-reservas"] });
      if (isMauricio) void syncFn();
    }
  }

  async function mudarStatus(r: Reserva, status: "concluida" | "cancelada" | "ativa") {
    const { error } = await supabase.from("mauricio_reservas").update({ status }).eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado");
      setEditando(null);
      void qc.invalidateQueries({ queryKey: ["m-reservas"] });
      void qc.invalidateQueries({ queryKey: ["m-reservas-todas"] });
      void qc.invalidateQueries({ queryKey: ["m-rev-reservas"] });
    }
  }

  async function excluir(r: Reserva) {
    if (!window.confirm(`Excluir permanentemente a reserva da cota ${r.cota} do grupo ${r.grupo}? Esta ação não pode ser desfeita.`)) return;
    const { data, error } = await supabase.from("mauricio_reservas").delete().eq("id", r.id).select("id");
    if (error || !data?.length) {
      toast.error(error?.message ?? "Não foi possível excluir a reserva");
      return;
    }
    toast.success("Reserva excluída");
    setEditando(null);
    void qc.invalidateQueries({ queryKey: ["m-reservas"] });
      void qc.invalidateQueries({ queryKey: ["m-reservas-todas"] });
      void qc.invalidateQueries({ queryKey: ["m-rev-reservas"] });
    void qc.invalidateQueries({ queryKey: ["m-reservas-todas"] });
    void qc.invalidateQueries({ queryKey: ["m-rev-reservas"] });
    void qc.invalidateQueries({ queryKey: ["mauricio-notificacoes"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reservas de Cotas</h1>
          <p className="text-sm text-muted-foreground">Alertas automáticos na véspera e no dia do vencimento.</p>
        </div>
        <Button onClick={() => { setEditando(null); setForm({ grupo: "", cota: "", vendedor: "", revenda: dealers[0] ?? "", validade: "", obs: "" }); setCriando(true); }}>
          <Plus className="h-4 w-4" /> Nova reserva
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(["ativa", "vence_amanha", "vence_hoje", "vencida", "concluida", "cancelada"] as ReservaStatus[]).map((s) => (
          <Card key={s}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{contagem(s)}</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por grupo, cota ou vendedor…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
              <SelectTrigger className="w-40" aria-label="Filtrar por grupo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo} value={String(grupo)}>Grupo {grupo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroRevenda} onValueChange={setFiltroRevenda}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as revendas</SelectItem>
                {dealers.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Grupo</th>
                <th className="px-2 py-2">Cota</th>
                <th className="px-2 py-2">Vendedor</th>
                <th className="px-2 py-2">Revenda</th>
                <th className="px-2 py-2">Validade</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Obs</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b hover:bg-accent/50"
                  onClick={() => {
                    setEditando(r);
                    setForm({
                      grupo: String(r.grupo),
                      cota: String(r.cota),
                      vendedor: r.vendedor ?? "",
                      revenda: r.revenda,
                      validade: r.validade,
                      obs: r.obs ?? "",
                    });
                  }}
                >
                  <td className="py-2 pr-3 font-medium">{r.grupo}</td>
                  <td className="px-2 py-2">{r.cota}</td>
                  <td className="px-2 py-2">{r.vendedor ?? "—"}</td>
                  <td className="px-2 py-2">{r.revenda}</td>
                  <td className="px-2 py-2">{r.validade.split("-").reverse().join("/")}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.efetivo]}`}>
                      {STATUS_LABEL[r.efetivo]}
                    </span>
                  </td>
                  <td className="max-w-40 truncate px-2 py-2 text-xs text-muted-foreground">{r.obs ?? ""}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma reserva encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={criando || editando !== null} onOpenChange={(o) => { if (!o) { setCriando(false); setEditando(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar reserva" : "Nova reserva"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Grupo" inputMode="numeric" value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} />
              <Input placeholder="Cota" inputMode="numeric" value={form.cota} onChange={(e) => setForm({ ...form, cota: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Vendedor" value={form.vendedor} onChange={(e) => setForm({ ...form, vendedor: e.target.value })} />
              <Select value={form.revenda} onValueChange={(v) => setForm({ ...form, revenda: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dealers.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Validade</label>
              <Input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
            </div>
            <Textarea placeholder="Observações" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
            <Button className="w-full" onClick={() => void salvar()}>
              {editando ? "Salvar alterações" : "Criar reserva"}
            </Button>
            {editando && editando.status === "ativa" && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => void mudarStatus(editando, "concluida")}>
                  Marcar como concluída
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => void mudarStatus(editando, "cancelada")}>
                  Cancelar reserva
                </Button>
              </div>
            )}
            {editando && editando.status !== "ativa" && (
              <Button variant="outline" className="w-full" onClick={() => void mudarStatus(editando, "ativa")}>
                Reativar reserva
              </Button>
            )}
            {editando && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => void excluir(editando)}
              >
                <Trash2 className="h-4 w-4" /> Excluir reserva permanentemente
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
