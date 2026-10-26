import { describe, expect, it } from "vitest";
import { canEditProposal, canOpenCommercialPage } from "./dealer-manager";

describe("gerência restrita da Multieixo", () => {
  it("não permite editar propostas de outros vendedores como gerente", () => {
    expect(canEditProposal("luis", "vendedor-multieixo", false)).toBe(false);
    expect(canEditProposal("luis", "luis", false)).toBe(true);
  });
  it("não abre a edição global de metas nem o calendário do Maurício", () => {
    expect(canOpenCommercialPage("/mauricio/metas", false, true)).toBe(false);
    expect(canOpenCommercialPage("/mauricio/calendario", false, true)).toBe(false);
    expect(canOpenCommercialPage("/mauricio/reservas", false, true)).toBe(false);
    expect(canOpenCommercialPage("/mauricio", false, true)).toBe(true);
    expect(canOpenCommercialPage("/mauricio/revenda/Multieixo", false, true)).toBe(true);
  });
  it("vendedores sem gerência continuam sem acesso comercial", () => {
    expect(canOpenCommercialPage("/mauricio", false, false)).toBe(false);
  });
  it("consultores podem abrir as quatro áreas comerciais sem administração global", () => {
    for (const path of ["/mauricio", "/mauricio/metas", "/mauricio/calendario", "/mauricio/reservas"]) {
      expect(canOpenCommercialPage(path, false, false, true)).toBe(true);
      expect(canOpenCommercialPage(path, false, false, false)).toBe(false);
    }
    expect(canEditProposal("patricia", "outro-vendedor", false)).toBe(false);
  });
});