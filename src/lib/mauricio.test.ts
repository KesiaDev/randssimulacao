import { describe, expect, it } from "vitest";
import { reservaStatusEfetivo, STATUS_LABEL } from "./mauricio";

/**
 * Regra dos alertas de reserva: a validade é uma data fixa e o status
 * efetivo muda sozinho a cada dia — "Vence amanhã", "Vence hoje" e
 * "Vencida". São esses dois primeiros estados que geram as notificações
 * na plataforma (véspera e dia do vencimento).
 */
function isoEm(dias: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

describe("status efetivo das reservas de cotas", () => {
  it("a 2 dias da validade ainda é apenas ativa (sem alerta)", () => {
    expect(reservaStatusEfetivo("ativa", isoEm(2))).toBe("ativa");
  });

  it("na véspera vira 'Vence amanhã'", () => {
    expect(reservaStatusEfetivo("ativa", isoEm(1))).toBe("vence_amanha");
    expect(STATUS_LABEL.vence_amanha).toBe("Vence amanhã");
  });

  it("no dia vira 'Vence hoje'", () => {
    expect(reservaStatusEfetivo("ativa", isoEm(0))).toBe("vence_hoje");
    expect(STATUS_LABEL.vence_hoje).toBe("Vence hoje");
  });

  it("no dia seguinte vira 'Vencida'", () => {
    expect(reservaStatusEfetivo("ativa", isoEm(-1))).toBe("vencida");
  });

  it("reserva concluída ou cancelada nunca gera alerta", () => {
    expect(reservaStatusEfetivo("concluida", isoEm(0))).toBe("concluida");
    expect(reservaStatusEfetivo("cancelada", isoEm(-5))).toBe("cancelada");
  });
});
