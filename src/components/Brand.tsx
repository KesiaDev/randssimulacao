export function Brand({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const main = variant === "dark" ? "text-sidebar-foreground" : "text-foreground";
  const sub = variant === "dark" ? "text-sidebar-foreground/60" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-[13px] font-bold tracking-tight text-primary-foreground">
        R
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className={`text-sm font-semibold tracking-tight ${main}`}>Randon Consórcios</div>
          <div className={`text-[11px] uppercase tracking-[0.14em] ${sub}`}>Simulador</div>
        </div>
      )}
    </div>
  );
}
