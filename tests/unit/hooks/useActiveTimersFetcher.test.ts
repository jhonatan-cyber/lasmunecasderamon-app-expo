import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { apiClientSafe } from "@/api/client";
import { useActiveTimersFetcher } from "@/context/hooks/useActiveTimersFetcher";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const setTimers = vi.fn();
  const props = {
    setTimers,
    setServerOffset: vi.fn(),
    serverOffsetRef: { current: 0 },
    setLoading: vi.fn(),
    timersRef: { current: [] },
  };
  const hook = renderHook(() => useActiveTimersFetcher(props));
  return { ...hook, setTimers };
}
describe("temporizadores de privados", () => {
  it("respeta la pausa booleana y el adicional que devuelve el servidor", async () => {
    vi.mocked(apiClientSafe).mockResolvedValueOnce({
      success: true,
      data: [
        {
          servicioId: "principal",
          roomId: "vip",
          duration: 60,
          remainingTime: 1200,
          isPaused: true,
          estado: 3,
          startTime: new Date().toISOString(),
          tipoTransaccion: "servicio",
        },
        {
          servicioId: "adicional",
          roomId: "vip",
          duration: 2,
          remainingTime: 120,
          isPaused: false,
          estado: 2,
          isTemporary: true,
          servicioOriginalId: "principal",
          startTime: new Date().toISOString(),
          tipoTransaccion: "servicio",
          total_comision: 10000,
        },
      ],
    });
    const { result, setTimers } = setup();
    await act(() => result.current.fetchActiveTimers());
    expect(setTimers).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          servicioId: "principal",
          isPaused: true,
          remainingTime: 1200,
        }),
        expect.objectContaining({
          servicioId: "adicional",
          es_temporal: true,
          servicio_original_id: "principal",
          duration: 2,
          remainingTime: 120,
          total_comision: 10000,
        }),
      ]),
    );
  });
  it("difiere un evento cercano en lugar de perder la actualización del servicio", async () => {
    vi.useFakeTimers();
    vi.mocked(apiClientSafe).mockResolvedValue({ success: true, data: [] });
    const { result } = setup();
    await act(() => result.current.fetchActiveTimers());
    await act(() => result.current.fetchActiveTimers());
    expect(apiClientSafe).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(apiClientSafe).toHaveBeenCalledTimes(2);
  });
});
