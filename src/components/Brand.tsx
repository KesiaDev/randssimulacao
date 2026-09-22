import randonLogo from "@/assets/randon-logo.png.asset.json";

export function Brand({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3" aria-label="Consórcio Nacional Randon">
      <img
        src={randonLogo.url}
        alt="Consórcio Nacional Randon"
        className={`h-auto w-36 max-w-full shrink-0 object-contain sm:w-44 ${variant === "dark" ? "brightness-0 invert" : "dark:brightness-0 dark:invert"}`}
      />
      {!compact && (
        <span className="sr-only">Simulador de consórcios</span>
      )}
    </div>
  );
}
