import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSolicitudesActions } from "@/hooks/useSolicitudesActions";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  role: "cajero",
  toast: vi.fn(),
}));
vi.mock("@/api/client", () => ({ apiClientSafe: mocks.api }));
vi.mock("react-native", () => ({
  AppState: {
    currentState: "background",
    addEventListener: () => ({ remove: vi.fn() }),
  },
}));
vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { role: mocks.role } }),
}));
vi.mock("@/hooks/useConfigValue", () => ({ useConfigValue: () => "10" }));
vi.mock("@/utils/offlineGuard", () => ({ blockOffline: () => true }));
vi.mock("@/utils/toast-lazy", () => ({ showToast: mocks.toast }));
vi.mock("expo-haptics", () => ({
  notificationAsync: vi.fn(),
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

const params = () => ({
  solicitudes: [],
  cajaAbierta: true,
  fetchSolicitudes: vi.fn(),
  removeSolicitudLocally: vi.fn(),
  pendingAutoOpen: null,
  setPendingAutoOpen: vi.fn(),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "cajero";
  mocks.api.mockResolvedValue({ success: true });
});
describe("Entrega de anticipos en Expo", () => {
  it.each([
    ["barman", 1],
    ["cajero", 2],
    ["administrador", 1],
  ])("%s no entrega un anticipo en estado %s", async (role, estado) => {
    mocks.role = role as string;
    const { result } = renderHook(() => useSolicitudesActions(params()));
    await act(async () => {
      await result.current.handleAprobar("advance", "anticipo", {
        estado,
        monto: 1000,
      } as never);
    });
    expect(result.current.alertConfig.visible).toBe(false);
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("el cajero entrega uno aprobado sin ejecutar una aprobación adicional", async () => {
    const { result } = renderHook(() => useSolicitudesActions(params()));
    await act(async () => {
      await result.current.handleAprobar("advance", "anticipo", {
        estado: 1,
        monto: 1000,
      } as never);
    });
    expect(result.current.alertConfig.visible).toBe(true);
    await act(async () => {
      await result.current.alertConfig.onConfirm?.();
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(mocks.api).toHaveBeenCalledWith("/advances/advance", {
      method: "PUT",
      body: JSON.stringify({ estado: 0 }),
    });
  });
});
