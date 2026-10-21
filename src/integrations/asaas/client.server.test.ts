import { afterEach, describe, expect, it, vi } from "vitest";
import { createCardInstallmentCharge } from "./client.server";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("prazo de vencimento das cobranças Asaas", () => {
  it.each([
    ["2026-10-21T14:47:00Z", "2026-10-23"],
    ["2026-10-22T01:00:00Z", "2026-10-23"],
    ["2026-12-31T14:00:00Z", "2027-01-02"],
  ])("envia vencimento dois dias após a emissão em São Paulo (%s)", async (now, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    vi.stubEnv("ASAAS_API_KEY", "test-only-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "test-payment", invoiceUrl: "https://example.test/invoice",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createCardInstallmentCharge({
      customerId: "test-customer", totalValue: 500, installmentCount: 12,
      description: "Licença de teste",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(request?.body));
    expect(payload.dueDate).toBe(expected);
  });
});