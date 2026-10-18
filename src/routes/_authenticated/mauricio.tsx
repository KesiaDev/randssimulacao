import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MAURICIO_USER_ID } from "@/lib/mauricio";

export const Route = createFileRoute("/_authenticated/mauricio")({
  component: MauricioLayout,
});

function MauricioLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const autorizado = user?.id === MAURICIO_USER_ID;

  useEffect(() => {
    if (!loading && !autorizado) void navigate({ to: "/dashboard", replace: true });
  }, [loading, autorizado, navigate]);

  if (loading || !autorizado) {
    return <p className="text-sm text-muted-foreground">Verificando permissões…</p>;
  }

  return <Outlet />;
}
