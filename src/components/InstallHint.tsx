import { useEffect, useState } from "react";
import { Check, Monitor, Smartphone, X } from "lucide-react";

// Aviso discreto, mostrado uma única vez na tela de entrada, ensinando cada
// pessoa a levar a plataforma para a tela inicial do aparelho. Se a pessoa
// dispensar, a escolha fica salva e o aviso não volta; se ela já estiver
// usando a plataforma instalada (tela cheia), nada é mostrado.
const DISMISS_KEY = "randon-install-hint";

type Platform = "ios" | "android" | "desktop";

function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    if ((navigator as { standalone?: boolean }).standalone === true) return true;
  } catch {
    // Ambiente sem matchMedia: segue com o aviso.
  }
  return false;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (/Android/.test(ua) || (coarse && window.innerWidth < 1024)) return "android";
  return "desktop";
}

const COPY: Record<Platform, { title: string; desc: string; steps: string[] }> = {
  android: {
    title: "Leve a plataforma para a sua tela inicial",
    desc: "Em poucos toques você abre a plataforma pelo ícone, em tela cheia, como um aplicativo.",
    steps: [
      "Toque nos três pontinhos do Chrome",
      "Escolha “Adicionar à tela inicial”",
      "Confirme em “Adicionar”",
    ],
  },
  ios: {
    title: "Leve a plataforma para a sua Tela de Início",
    desc: "Em poucos toques você abre a plataforma pelo ícone, em tela cheia, como um aplicativo.",
    steps: [
      "Toque no ícone Compartilhar do Safari",
      "Escolha “Adicionar à Tela de Início”",
      "Confirme em “Adicionar”",
    ],
  },
  desktop: {
    title: "Instale a plataforma no seu computador",
    desc: "Em poucos cliques você abre a plataforma pelo ícone, em tela cheia, como um programa.",
    steps: [
      "Procure o ícone de instalação na barra de endereço",
      "Clique em “Instalar”",
    ],
  },
};

export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("android");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Sem acesso ao armazenamento local: mostra o aviso normalmente.
    }
    if (isStandalone()) return;
    setPlatform(detectPlatform());
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Se não for possível salvar, apenas esconde nesta visita.
    }
    setVisible(false);
  }

  if (!visible) return null;

  const copy = COPY[platform];
  const Icon = platform === "desktop" ? Monitor : Smartphone;

  return (
    <section className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-snug">{copy.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{copy.desc}</p>
          <ol className="mt-3 space-y-2">
            {copy.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3" aria-hidden />
              Leva menos de um minuto
            </span>
            <button
              type="button"
              onClick={dismiss}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden />
              Não agora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
