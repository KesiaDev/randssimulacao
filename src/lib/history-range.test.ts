import { describe, expect, it } from "vitest";
import { historyRangeError, validHistoryDate } from "./history-range";

describe("período De/Até do histórico", () => {
  it("permite incluir o mesmo dia nas duas extremidades", () => {
    expect(historyRangeError("2026-10-23", "2026-10-23")).toBeNull();
  });
  it("permite buscar a partir de uma data ou até uma data", () => {
    expect(historyRangeError("2026-10-01", "")).toBeNull();
    expect(historyRangeError("", "2026-10-23")).toBeNull();
  });
  it("não envia intervalo invertido ou data inexistente ao banco", () => {
    expect(historyRangeError("2026-10-24", "2026-10-23")).not.toBeNull();
    expect(validHistoryDate("2026-02-30")).toBe(false);
    expect(validHistoryDate("2024-02-29")).toBe(true);
  });
});