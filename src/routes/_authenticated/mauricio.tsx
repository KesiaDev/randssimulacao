import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MAURICIO_USER_ID } from "@/lib/mauricio";
import { canOpenCommercialPage } from "@/lib/dealer-manager";

export const Route = createFileRoute("/_authenticated/mauricio")({
  component: MauricioLayout,
});

function MauricioLayout() {
  const { loading, user, isDealerManager } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const autorizado = canOpenCommercialPage(pathname, user?.id === MAURICIO_USER_ID, isDealerManager);

  useEffect(() => {
    if (!loading && !autorizado) void navigate({ to: "/dashboard", replace: true });
  }, [loading, autorizado, navigate]);

  if (loading || !autorizado) {
    return <p className="text-sm text-muted-foreground">Verificando permissões…</p>;
  }

  return <Outlet />;
}
