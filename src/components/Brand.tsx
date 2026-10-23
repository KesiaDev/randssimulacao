import randonLogo from "@/assets/randon-logo.png.asset.json";
import multieixoLogo from "@/assets/randon-multieixo-logo.png.asset.json";
import { useIsMultieixo } from "@/hooks/useAuth";

export function Brand({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const multieixo = useIsMultieixo();
  const logo = multieixo ? multieixoLogo : randonLogo;
  const label = multieixo ? "Randon Multieixo" : "Consórcio Nacional Randon";
  return (
    <div className="flex min-w-0 items-center gap-3" aria-label={label}>
      <img
        src={logo.url}
        alt={label}
        className={`h-auto w-36 max-w-full shrink-0 object-contain sm:w-44 ${variant === "dark" ? "brightness-0 invert" : "dark:brightness-0 dark:invert"}`}
      />
      {!compact && (
        <span className="sr-only">Simulador de consórcios</span>
      )}
    </div>
  );
}
