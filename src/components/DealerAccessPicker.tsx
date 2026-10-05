// Seletor de revendas em formato de chips clicáveis — usado tanto para
// restringir grupos/taxas a revendas específicas (admin.grupos.tsx) quanto
// para liberar revendas extras a um vendedor (admin.equipe.tsx).
export function DealerAccessPicker({
  dealers,
  selectedIds,
  onToggle,
}: {
  dealers: Array<{ id: string; name: string }>;
  selectedIds: Set<string>;
  onToggle: (dealerId: string, selected: boolean) => void;
}) {
  if (dealers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {dealers.map((d) => {
        const active = selectedIds.has(d.id);
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onToggle(d.id, !active)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {d.name}
          </button>
        );
      })}
    </div>
  );
}
