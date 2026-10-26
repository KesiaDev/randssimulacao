import { useAuth } from "@/hooks/useAuth";
import { MAURICIO_USER_ID, REVENDAS } from "@/lib/mauricio";

export function useCommercialAccess() {
  const auth = useAuth();
  const isMauricio = auth.user?.id === MAURICIO_USER_ID;
  const dealers = isMauricio ? [...REVENDAS] : auth.consultantDealers.map(d => d.name);
  return { ...auth, isMauricio, dealers, canManageCommercial: isMauricio || auth.isCommercialConsultant };
}