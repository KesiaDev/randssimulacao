export function canEditProposal(actorId: string | undefined, sellerId: string, isAdmin: boolean) {
  return isAdmin || actorId === sellerId;
}

export function canOpenCommercialPage(pathname: string, isMauricio: boolean, isManager: boolean, isConsultant = false) {
  if (isMauricio || isConsultant) return true;
  return isManager && (pathname === "/mauricio" || pathname === "/mauricio/" || pathname.startsWith("/mauricio/revenda/"));
}