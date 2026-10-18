import { describe, expect, it } from "vitest";
import { createLanceDraft } from "./lance-draft";

describe("abertura da simulação de lance", () => {
  it("inicia os dois lances em 0%", () => {
    expect(createLanceDraft()).toEqual({ embeddedPct: "0", cashPct: "0", modality: "reduzir_prazo" });
  });

  it("reabrir não reaproveita os percentuais nem a modalidade editados", () => {
    const previous = createLanceDraft();
    previous.embeddedPct = "40";
    previous.cashPct = "20";
    previous.modality = "reduzir_parcela";
    const reopened = createLanceDraft();
    expect(reopened.embeddedPct).toBe("0");
    expect(reopened.cashPct).toBe("0");
    expect(reopened.modality).toBe("reduzir_prazo");
    expect(previous).toEqual({ embeddedPct: "40", cashPct: "20", modality: "reduzir_parcela" });
  });
});