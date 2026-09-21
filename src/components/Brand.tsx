import randonLogo from "@/assets/randon-logo.png.asset.json";

export function Brand({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3" aria-label="Consórcio Nacional Randon">
      <img
        src={randonLogo.url}
        alt="Consórcio Nacional Randon"
        className={`h-auto w-44 object-contain ${variant === "dark" ? "brightness-0 invert" : ""}`}
      />
      {!compact && (
        <span className="sr-only">Simulador de consórcios</span>
      )}
    </div>
  );
}
