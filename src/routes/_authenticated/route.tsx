import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const ACCESS_KEY = "rands-last-access-log";
const ACCESS_GAP_MS = 30 * 60 * 1000;

function AuthenticatedLayout() {
  const { loading } = useAuth();

  useEffect(() => {
    const log = () => {
      if (document.visibilityState !== "visible") return;
      const last = Number(sessionStorage.getItem(ACCESS_KEY) ?? 0);
      if (Date.now() - last < ACCESS_GAP_MS) return;
      sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
      void supabase.rpc("log_platform_access");
    };
    log();
    document.addEventListener("visibilitychange", log);
    return () => document.removeEventListener("visibilitychange", log);
  }, []);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
