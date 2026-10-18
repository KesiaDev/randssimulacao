import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { EVENTO_TIPO_COR, REVENDAS } from "@/lib/mauricio";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mauricio/calendario")({
  head: () => ({ meta: [{ title: "Calendário de Visitas — Gestão Comercial" }] }),
  component: CalendarioPage,
});

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Evento {
  id: string;
  data: string;
  titulo: string;
  revenda: string | null;
  cidade: string | null;
  estado: string | null;
  tipo: string;
  status: string;
  observacao: string | null;
  logistica: string | null;
}

function CalendarioPage() {
  const qc = useQueryClient();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0-based
  const [selecionado, setSelecionado] = useState<Evento | null>(null);
  const [criando, setCriando] = useState<string | null>(null); // data iso
  const [form, setForm] = useState({ titulo: "", revenda: "", cidade: "", tipo: "visita", logistica: "" });

  const inicio = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const fimDate = new Date(ano, mes + 1, 0);
  const fim = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(fimDate.getDate()).padStart(2, "0")}`;

  const { data: eventos } = useQuery({
    queryKey: ["m-eventos", ano, mes],
    queryFn: async () =>
      (
        await supabase
          .from("mauricio_eventos")
          .select("*")
          .gte("data", inicio)
          .lte("data", fim)
          .order("data")
      ).data ?? [],
  });

  function mudarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  }

  // grade: semanas começando na segunda
  const primeiroDia = new Date(ano, mes, 1);
  const offset = (primeiroDia.getDay() + 6) % 7; // seg=0
  const diasNoMes = fimDate.getDate();
  const celulas: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  function eventosDoDia(dia: number): Evento[] {
    const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return (eventos ?? []).filter((e) => e.data === iso) as Evento[];
  }

  async function criarEvento() {
    if (!form.titulo.trim() || !criando) return;
    const { error } = await supabase.from("mauricio_eventos").insert({
      data: criando,
      titulo: form.titulo.trim(),
      revenda: form.revenda || null,
      cidade: form.cidade || null,
      tipo: form.tipo,
      logistica: form.logistica || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Evento criado");
      setCriando(null);
      setForm({ titulo: "", revenda: "", cidade: "", tipo: "visita", logistica: "" });
      void qc.invalidateQueries({ queryKey: ["m-eventos"] });
    }
  }

  async function cancelarEvento(id: string) {
    const { error } = await supabase.from("mauricio_eventos").update({ status: "cancelado" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Evento cancelado");
      setSelecionado(null);
      void qc.invalidateQueries({ queryKey: ["m-eventos"] });
    }
  }

  const hojeIso = hoje.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário de Visitas</h1>
          <p className="text-sm text-muted-foreground">Clique num dia para criar um evento; clique num evento para detalhes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-36 text-center font-medium">
            {NOMES_MESES[mes]} {ano}
          </span>
          <Button variant="outline" size="icon" onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries({ visita: "Visita comercial", evento: "Evento/convenção", feriado: "Feriado", folga: "Folga/férias", pendencia: "Pendência" }).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${EVENTO_TIPO_COR[k]}`} /> {label}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (dia === null) return <div key={i} className="min-h-20 rounded bg-muted/30" />;
              const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const evs = eventosDoDia(dia);
              const ehHoje = iso === hojeIso;
              return (
                <button
                  key={i}
                  onClick={() => setCriando(iso)}
                  className={`min-h-20 rounded border p-1 text-left align-top transition-colors hover:bg-accent ${
                    ehHoje ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <span className={`text-xs ${ehHoje ? "font-bold text-primary" : "text-muted-foreground"}`}>{dia}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {evs.map((e) => (
                      <span
                        key={e.id}
                        role="button"
                        tabIndex={0}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelecionado(e);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.stopPropagation();
                            setSelecionado(e);
                          }
                        }}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white ${EVENTO_TIPO_COR[e.tipo] ?? "bg-blue-500"} ${
                          e.status === "cancelado" ? "opacity-40 line-through" : ""
                        }`}
                      >
                        {e.titulo}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={selecionado !== null} onOpenChange={(o) => !o && setSelecionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selecionado?.titulo}</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-2 text-sm">
              <p><strong>Data:</strong> {selecionado.data.split("-").reverse().join("/")}</p>
              {selecionado.revenda && <p><strong>Revenda:</strong> {selecionado.revenda}</p>}
              {selecionado.cidade && <p><strong>Cidade:</strong> {selecionado.cidade}{selecionado.estado ? `/${selecionado.estado}` : ""}</p>}
              <p><strong>Tipo:</strong> {selecionado.tipo} · <strong>Status:</strong> {selecionado.status}</p>
              {selecionado.logistica && <p><strong>Logística:</strong> {selecionado.logistica}</p>}
              {selecionado.observacao && <p><strong>Obs:</strong> {selecionado.observacao}</p>}
              {selecionado.status !== "cancelado" && (
                <Button variant="destructive" size="sm" onClick={() => void cancelarEvento(selecionado.id)}>
                  Cancelar evento
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={criando !== null} onOpenChange={(o) => !o && setCriando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo evento — {criando?.split("-").reverse().join("/")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título (ex.: Visita Rodoeste)"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.revenda} onValueChange={(v) => setForm({ ...form, revenda: v })}>
                <SelectTrigger><SelectValue placeholder="Revenda" /></SelectTrigger>
                <SelectContent>
                  {REVENDAS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visita">Visita comercial</SelectItem>
                  <SelectItem value="evento">Evento/convenção</SelectItem>
                  <SelectItem value="feriado">Feriado</SelectItem>
                  <SelectItem value="folga">Folga/férias</SelectItem>
                  <SelectItem value="pendencia">Pendência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Cidade (opcional)"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
            <Textarea
              placeholder="Logística / observações (voo, hotel, carro…)"
              value={form.logistica}
              onChange={(e) => setForm({ ...form, logistica: e.target.value })}
            />
            <Button className="w-full" onClick={() => void criarEvento()}>Salvar evento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
