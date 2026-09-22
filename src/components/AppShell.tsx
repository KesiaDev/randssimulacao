import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Calculator,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { Brand } from "./Brand";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const sellerNav = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/simular", label: "Nova proposta", icon: Calculator },
  { to: "/historico", label: "Propostas e histórico", icon: ClipboardList },
] as const;

const adminNav = [
  { to: "/admin", label: "Administração", icon: Settings2 },
  { to: "/admin/grupos", label: "Grupos e regras", icon: Settings2 },
  { to: "/admin/equipe", label: "Minha equipe", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [...sellerNav, ...(isAdmin ? adminNav : [])];

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col bg-sidebar shadow-2xl transition-transform duration-200 lg:static lg:z-40 lg:w-64 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <Brand variant="dark" />
          <Button variant="ghost" size="icon" className="text-sidebar-foreground lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5 text-sidebar-foreground/70" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 truncate text-xs text-sidebar-foreground/60">
            {profile?.name || profile?.email}
            <div className="mt-0.5 uppercase tracking-[0.12em]">
              {isAdmin ? "Administrador" : "Vendedor"}
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => void signOut()}
            className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur sm:px-5 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0"><Brand compact /></div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-5 print:p-0 sm:px-6 sm:py-7 lg:px-8 lg:py-8 xl:px-10 xl:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer className="no-print border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6 lg:px-10">
          Ferramenta interna de simulação · Valores sujeitos às condições e regras vigentes do grupo.
        </footer>
      </div>
    </div>
  );
}
