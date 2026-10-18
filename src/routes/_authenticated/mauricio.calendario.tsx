import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { REVENDAS } from "@/lib/mauricio";
import { businessDate, occursOn, deleteCalendarEvent, EVENT_LABELS, EVENT_TONES, EVENT_QUERY_KEYS, type CalendarEvent } from "@/lib/commercial-calendar";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, List, MapPin, Bell, Pencil, Trash2, Check, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mauricio/calendario")({
  head: () => ({ meta: [
    { title: "Calendário e Agenda do Maurício — Randon" },
    { name: "description", content: "Agenda comercial Randon com compromissos, visitas e avisos para o Maurício." },
    { property: "og:title", content: "Calendário Comercial — Randon" },
    { property: "og:description", content: "Visitas e compromissos comerciais organizados com avisos de hoje e amanhã." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: CalendarioPage,
});
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dateLabel = (date: string) => date.split("-").reverse().join("/");
const emptyForm = (date: string) => ({ titulo: "", data: date, data_fim: "", revenda: "none", cidade: "", estado: "", tipo: "visita", logistica: "", observacao: "", status: "confirmado" });

function CalendarioPage() {
  const qc = useQueryClient();
  const today = businessDate();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [day, setDay] = useState(today);
  const [view, setView] = useState("month");
  const [dealer, setDealer] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(today));
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const { reminders, error: reminderError } = useAppointmentReminders();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const daysCount = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${daysCount}`;
  const eventsQuery = useQuery({
    queryKey: ["m-eventos", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.from("mauricio_eventos").select("*").lte("data", end).or(`data_fim.gte.${start},data.gte.${start}`).order("data");
      if (error) throw error;
      return data;
    },
  });
  const events = (eventsQuery.data ?? []).filter(e => (dealer === "all" || e.revenda === dealer) && `${e.titulo} ${e.cidade ?? ""} ${e.revenda ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const dayEvents = events.filter(e => occursOn(e, day));
  const activeCount = events.filter(e => !["cancelado", "concluido"].includes(e.status)).length;
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((offset + daysCount) / 7) * 7 }, (_, i) => i >= offset && i < offset + daysCount ? i - offset + 1 : null);
  async function refresh() { await Promise.all(EVENT_QUERY_KEYS.map(key => qc.invalidateQueries({ queryKey: [key] }))); }
  function move(delta: number) { const d = new Date(year, month + delta, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`); }
  function goToday() { setYear(Number(today.slice(0, 4))); setMonth(Number(today.slice(5, 7)) - 1); setDay(today); }
  function openNew(date = day) { setEditing(null); setForm(emptyForm(date)); setEditor(true); }
  function editEvent(e: CalendarEvent) { setSelected(null); setEditing(e.id); setForm({ titulo: e.titulo, data: e.data, data_fim: e.data_fim ?? "", revenda: e.revenda ?? "none", cidade: e.cidade ?? "", estado: e.estado ?? "", tipo: e.tipo, logistica: e.logistica ?? "", observacao: e.observacao ?? "", status: e.status }); setEditor(true); }
  async function save() {
    if (!form.titulo.trim() || !form.data) { toast.error("Informe o título e a data."); return; }
    if (form.data_fim && form.data_fim < form.data) { toast.error("A data final não pode ser anterior ao início."); return; }
    setBusy(true);
    try {
      const row = { ...form, titulo: form.titulo.trim(), data_fim: form.data_fim || null, revenda: form.revenda === "none" ? null : form.revenda, cidade: form.cidade || null, estado: form.estado || null, logistica: form.logistica || null, observacao: form.observacao || null };
      const result = editing ? await supabase.from("mauricio_eventos").update(row).eq("id", editing).select("id").single() : await supabase.from("mauricio_eventos").insert(row).select("id").single();
      if (result.error) throw result.error;
      setEditor(false); setDay(form.data); setYear(Number(form.data.slice(0, 4))); setMonth(Number(form.data.slice(5, 7)) - 1);
      await refresh(); toast.success(editing ? "Compromisso atualizado" : "Compromisso criado");
    } catch { toast.error("Não foi possível salvar o compromisso. Tente novamente."); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try { await deleteCalendarEvent(supabase, deleting.id); setDeleting(null); setSelected(null); await refresh(); toast.success("Compromisso excluído permanentemente de todas as telas e avisos."); }
    catch { toast.error("Não foi possível excluir. O compromisso foi mantido."); } finally { setBusy(false); }
  }
  async function complete(e: CalendarEvent) {
    setBusy(true);
    try { const { error } = await supabase.from("mauricio_eventos").update({ status: "concluido" }).eq("id", e.id).select("id").single(); if (error) throw error; setSelected(null); await refresh(); toast.success("Compromisso concluído"); }
    catch { toast.error("Não foi possível concluir o compromisso."); } finally { setBusy(false); }
  }
  function eventRow(e: CalendarEvent) {
    return <Button key={e.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal rounded-lg border p-3 text-left" onClick={() => setSelected(e)}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-l-2 ${EVENT_TONES[e.tipo] ?? EVENT_TONES.visita}`}><CalendarDays /></span>
      <span className="min-w-0 flex-1 space-y-1"><span className={`block break-words font-semibold ${e.status === "cancelado" ? "line-through text-muted-foreground" : ""}`}>{e.titulo}</span><span className="block text-xs text-muted-foreground">{dateLabel(e.data)}{e.data_fim ? ` — ${dateLabel(e.data_fim)}` : ""} · {e.revenda ?? EVENT_LABELS[e.tipo] ?? e.tipo}</span>{e.cidade && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{e.cidade}{e.estado ? ` / ${e.estado}` : ""}</span>}</span><ChevronRight className="shrink-0 text-muted-foreground" />
    </Button>;
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Agenda comercial</p><h1 className="mt-1 text-2xl font-bold">Calendário do Maurício</h1><p className="mt-1 text-sm text-muted-foreground">Visitas, encontros e próximos compromissos.</p></div><Button onClick={() => openNew()}><Plus /> Novo compromisso</Button></header>
    {(reminders.length > 0 || reminderError) && <section className="space-y-3 border-y py-4"><h2 className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-primary" /> Hoje e amanhã</h2>{reminderError ? <p className="text-sm text-destructive">Não foi possível carregar os avisos de compromissos.</p> : <div className="flex flex-wrap gap-2">{reminders.map(r => <Button key={r.event.id} variant="secondary" className="h-auto max-w-full justify-start whitespace-normal py-3 text-left" onClick={() => setSelected(r.event)}><Bell className="shrink-0" /><span><span className="block text-xs font-semibold text-primary">{r.type === "hoje" ? "Hoje" : "Amanhã"} · {dateLabel(r.date)}</span><span className="block break-words">{r.event.titulo}</span></span></Button>)}</div>}</section>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-1"><Button variant="outline" size="icon" title="Mês anterior" aria-label="Mês anterior" onClick={() => move(-1)}><ChevronLeft /></Button><h2 className="w-40 text-center font-semibold" aria-live="polite">{MONTHS[month]} {year}</h2><Button variant="outline" size="icon" title="Próximo mês" aria-label="Próximo mês" onClick={() => move(1)}><ChevronRight /></Button><Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button></div><div className="flex rounded-md border p-1" role="group" aria-label="Visualização do calendário"><Button variant={view === "month" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "month"} onClick={() => setView("month")}><CalendarDays /> Mês</Button><Button variant={view === "agenda" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "agenda"} onClick={() => setView("agenda")}><List /> Agenda</Button></div></div>
    <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1 basis-52"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Buscar compromissos" placeholder="Buscar compromisso ou cidade" value={search} onChange={e => setSearch(e.target.value)} /></div><Select value={dealer} onValueChange={setDealer}><SelectTrigger aria-label="Filtrar revenda" className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as revendas</SelectItem>{REVENDAS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><span className="text-xs text-muted-foreground">{activeCount} compromissos ativos no mês</span></div>
    {eventsQuery.isPending ? <p role="status" className="py-10 text-center text-muted-foreground">Carregando agenda…</p> : eventsQuery.isError ? <p role="alert" className="py-10 text-destructive">Não foi possível carregar a agenda.</p> : view === "month" ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0"><div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground">{DAYS.map(d => <div key={d} className="py-3">{d}</div>)}</div><div className="grid grid-cols-7 border-l border-t">{cells.map((n, i) => {
        if (n === null) return <div key={i} className="min-h-20 border-b border-r bg-muted/30 sm:min-h-28" />;
        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
        const list = events.filter(e => occursOn(e, iso));
        return <div key={iso} className={`min-w-0 border-b border-r p-1 sm:p-2 ${iso === day ? "bg-accent/50" : "bg-card"}`}><Button variant="ghost" aria-label={`Ver dia ${dateLabel(iso)}`} aria-pressed={iso === day} onClick={() => setDay(iso)} className={`h-8 w-full justify-start px-1 ${iso === today ? "font-bold text-primary" : ""}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${iso === today ? "bg-primary text-primary-foreground" : ""}`}>{n}</span></Button><div className="min-h-10 space-y-1 sm:min-h-16"><span className="block text-center text-[10px] text-muted-foreground sm:hidden">{list.length ? `${list.length} ag.` : ""}</span>{list.slice(0, 2).map(e => <Button key={e.id} variant="ghost" title={e.titulo} onClick={() => setSelected(e)} className={`hidden h-auto w-full justify-start overflow-hidden rounded border-l-2 px-1 py-1 text-[10px] sm:flex ${EVENT_TONES[e.tipo] ?? EVENT_TONES.visita} ${e.status === "cancelado" ? "opacity-50 line-through" : ""}`}><span className="truncate">{e.titulo}</span></Button>)}{list.length > 2 && <span className="hidden text-[10px] text-muted-foreground sm:block">+{list.length - 2} compromissos</span>}</div></div>;
      })}</div><div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">{Object.entries(EVENT_LABELS).map(([k, label]) => <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 border-l-2 ${EVENT_TONES[k]}`} />{label}</span>)}</div></section>
      <aside className="min-w-0 space-y-4 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{dateLabel(day)}</h3><p className="text-xs text-muted-foreground">{dayEvents.length} compromissos</p></div><Button variant="outline" size="icon" title="Adicionar compromisso neste dia" aria-label="Adicionar compromisso neste dia" onClick={() => openNew(day)}><Plus /></Button></div><div className="space-y-2">{dayEvents.map(eventRow)}{dayEvents.length === 0 && <div className="py-10 text-center"><CalendarDays className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="text-sm text-muted-foreground">Dia sem compromissos.</p><Button variant="link" onClick={() => openNew(day)}>Agendar compromisso</Button></div>}</div></aside>
    </div> : <section className="space-y-2">{events.length ? events.map(eventRow) : <p className="py-12 text-center text-muted-foreground">Nenhum compromisso encontrado neste mês.</p>}</section>}
    <Dialog open={selected !== null} onOpenChange={o => !o && setSelected(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.titulo}</DialogTitle><DialogDescription>Detalhes do compromisso comercial</DialogDescription></DialogHeader>{selected && <div className="space-y-4 text-sm"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{EVENT_LABELS[selected.tipo] ?? selected.tipo}</Badge><Badge variant="outline">{selected.status}</Badge></div><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{dateLabel(selected.data)}{selected.data_fim ? ` até ${dateLabel(selected.data_fim)}` : ""}</p>{selected.revenda && <p><strong>Revenda:</strong> {selected.revenda}</p>}{selected.cidade && <p><strong>Local:</strong> {selected.cidade}{selected.estado ? ` / ${selected.estado}` : ""}</p>}{selected.logistica && <p className="whitespace-pre-wrap"><strong>Logística:</strong> {selected.logistica}</p>}{selected.observacao && <p className="whitespace-pre-wrap"><strong>Observações:</strong> {selected.observacao}</p>}<div className="flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" onClick={() => editEvent(selected)}><Pencil /> Editar</Button>{!["concluido", "cancelado"].includes(selected.status) && <Button variant="secondary" disabled={busy} onClick={() => void complete(selected)}><Check /> Concluir</Button>}<Button variant="destructive" disabled={busy} onClick={() => { setDeleting(selected); setSelected(null); }}><Trash2 /> Excluir</Button></div></div>}</DialogContent></Dialog>
    <Dialog open={editor} onOpenChange={o => !busy && setEditor(o)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Editar compromisso" : "Novo compromisso"}</DialogTitle><DialogDescription>Datas e informações da agenda do Maurício.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}><label className="block space-y-1 text-sm">Título<Input required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Visita comercial Multieixo" /></label><div className="grid grid-cols-2 gap-3"><label className="block space-y-1 text-sm">Data de início<Input type="date" required value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></label><label className="block space-y-1 text-sm">Data final (opcional)<Input type="date" min={form.data} value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} /></label></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1 text-sm">Revenda<Select value={form.revenda} onValueChange={v => setForm({ ...form, revenda: v })}><SelectTrigger aria-label="Revenda do compromisso"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem revenda</SelectItem>{REVENDAS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1 text-sm">Tipo<Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}><SelectTrigger aria-label="Tipo do compromisso"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EVENT_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-[1fr_80px] gap-3"><label className="block space-y-1 text-sm">Cidade<Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></label><label className="block space-y-1 text-sm">UF<Input maxLength={2} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></label></div><label className="block space-y-1 text-sm">Logística<Textarea value={form.logistica} onChange={e => setForm({ ...form, logistica: e.target.value })} placeholder="Voo, hotel, carro…" /></label><label className="block space-y-1 text-sm">Observações<Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} /></label><p className="flex items-center gap-2 text-xs text-muted-foreground"><Bell className="h-4 w-4 shrink-0" />Avisos no sino da plataforma na véspera e no dia, enquanto a plataforma estiver aberta.</p><Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar compromisso"}</Button></form></DialogContent></Dialog>
    <AlertDialog open={deleting !== null} onOpenChange={o => !busy && !o && setDeleting(null)}><AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg"><AlertDialogHeader><AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle><AlertDialogDescription>“{deleting?.titulo}” será removido do calendário, da agenda, das próximas visitas e dos avisos. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Manter compromisso</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={() => void remove()}><Trash2 />{busy ? "Excluindo…" : "Excluir permanentemente"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
