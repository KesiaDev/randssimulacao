import { describe, expect, it, vi } from "vitest";
import { appointmentReminder, businessDate, deleteCalendarEvent, nextDate, occursOn } from "./commercial-calendar";

describe("calendário e avisos do Maurício", () => {
  it("avisa na véspera e no dia, sem avisar dois dias antes", () => {
    const e = { data: "2026-10-19", data_fim: null, status: "confirmado" };
    expect(appointmentReminder(e, "2026-10-17")).toBeNull();
    expect(appointmentReminder(e, "2026-10-18")).toBe("amanha");
    expect(appointmentReminder(e, "2026-10-19")).toBe("hoje");
    expect(appointmentReminder(e, "2026-10-20")).toBeNull();
  });
  it("não avisa compromissos cancelados ou concluídos", () => {
    for (const status of ["cancelado", "concluido"]) expect(appointmentReminder({ data: "2026-10-19", data_fim: null, status }, "2026-10-19")).toBeNull();
  });
  it("preserva compromissos de vários dias até a data final", () => {
    const event = { data: "2026-10-19", data_fim: "2026-10-21", status: "confirmado" };
    expect(occursOn(event, "2026-10-20")).toBe(true);
    expect(appointmentReminder(event, "2026-10-21")).toBe("hoje");
    expect(appointmentReminder(event, "2026-10-22")).toBeNull();
  });
  it("usa o dia de São Paulo, inclusive perto da meia-noite UTC", () => {
    expect(businessDate(new Date("2026-10-19T01:00:00Z"))).toBe("2026-10-18");
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });
  it("exclui permanentemente e confere o registro removido, sem mudar apenas o status", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "event-123" }, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const remove = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: remove }));
    // A partial query chain models only the operation under test.
    await deleteCalendarEvent({ from } as unknown as Parameters<typeof deleteCalendarEvent>[0], "event-123");
    expect(from).toHaveBeenCalledWith("mauricio_eventos");
    expect(remove).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith("id", "event-123");
    expect(select).toHaveBeenCalledWith("id");
  });
  it("não anuncia sucesso se a exclusão falhar", async () => {
    const from = () => ({ delete: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: "Sem permissão" } }) }) }) }) });
    await expect(deleteCalendarEvent({ from } as unknown as Parameters<typeof deleteCalendarEvent>[0], "event-123")).rejects.toThrow("Sem permissão");
  });
});