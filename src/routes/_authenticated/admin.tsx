import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) void navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return <p className="text-sm text-muted-foreground">Verificando permissões…</p>;
  }

  return <Outlet />;
}
