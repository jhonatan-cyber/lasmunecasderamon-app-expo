import { act, renderHook, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClientSafe } from "@/api/client";
import { useGarzonServiciosScreen } from "@/hooks/useGarzonServiciosScreen";

/**
 * Baucher del servicio pagado con transferencia: la cámara se abre al elegir el
 * método, sin foto la solicitud no sale y con foto viaja en el payload.
 */

const showToast = vi.hoisted(() => vi.fn());
vi.mock("@/utils/toast-lazy", () => ({ showToast, hideToast: vi.fn() }));

vi.mock("@/utils/offlineGuard", () => ({ blockOffline: vi.fn(() => true) }));

const imagePicker = vi.hoisted(() => ({
  requestCameraPermissionsAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
}));
vi.mock("expo-image-picker", () => imagePicker);

const ajusteBaucher = vi.hoisted(() => ({ ajustarFotoBaucher: vi.fn() }));
vi.mock("@/utils/baucherFoto", () => ajusteBaucher);

const HABITACION = {
  id: 1,
  name: "Suite",
  numero: "101",
  price: 50000,
  precio: 50000,
  time: 60,
  tiempo: 60,
  status: 1,
  comision_anfitriona: 0,
};

const FOTO = "data:image/jpeg;base64,Zm90b19iYXVjaGVy";

function llamadasA(endpoint: string) {
  return vi
    .mocked(apiClientSafe)
    .mock.calls.filter(([url]) => String(url) === endpoint);
}

function cuerpoDe(endpoint: string) {
  const [url, options] = llamadasA(endpoint)[0];
  expect(url).toBe(endpoint);
  return JSON.parse(String((options as { body?: string }).body));
}

describe("useGarzonServiciosScreen · baucher de transferencia", () => {
  beforeEach(() => {
    vi.mocked(apiClientSafe).mockReset();
    vi.mocked(apiClientSafe).mockImplementation((async (endpoint: string) => {
      if (endpoint === "/service-requests")
        return { success: true, data: { id: "sol-1" } } as never;
      return { success: true, data: [] } as never;
    }) as never);

    imagePicker.requestCameraPermissionsAsync.mockReset();
    imagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    // Por defecto el garzón cancela la cámara: así los tests que no usan
    // transferencia no reciben una foto que nadie pidió.
    imagePicker.launchCameraAsync.mockReset();
    imagePicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: [] });

    ajusteBaucher.ajustarFotoBaucher.mockReset();
    ajusteBaucher.ajustarFotoBaucher.mockImplementation(
      async (dataUrl: string) => ({ ok: true, dataUrl }),
    );

    showToast.mockReset();
    vi.mocked(Alert.alert).mockClear();
  });

  /** Servicio completo (habitación, anfitriona y precio) listo para enviar. */
  const montarServicioListo = async () => {
    const { result } = renderHook(() => useGarzonServiciosScreen());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSelectedRoom(HABITACION as never);
      result.current.toggleHostess(7);
      result.current.setServicePrice("20.000");
    });

    return result;
  };

  it("al elegir transferencia abre la cámara y guarda la foto del baucher", async () => {
    imagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ base64: "Zm90b19iYXVjaGVy" }],
    });
    const result = await montarServicioListo();

    await act(async () => {
      result.current.setPaymentMethod("transferencia");
    });

    expect(result.current.paymentMethod).toBe("transferencia");
    expect(imagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    expect(result.current.baucherFoto).toBe(FOTO);
  });

  it("no envía la solicitud de transferencia sin la foto del baucher", async () => {
    const result = await montarServicioListo();

    await act(async () => {
      result.current.setPaymentMethod("transferencia");
    });
    // La cámara se canceló: el método queda en transferencia pero sin foto.
    expect(result.current.baucherFoto).toBeNull();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Falta el baucher",
      expect.stringContaining("foto del baucher"),
    );
    expect(llamadasA("/service-requests")).toHaveLength(0);
  });

  it("envía la foto del baucher junto a la solicitud de transferencia", async () => {
    imagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ base64: "Zm90b19iYXVjaGVy" }],
    });
    const result = await montarServicioListo();

    await act(async () => {
      result.current.setPaymentMethod("transferencia");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    const payload = cuerpoDe("/service-requests");
    expect(payload.metodo_pago).toBe("transferencia");
    expect(payload.baucher_foto).toBe(FOTO);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("el pago con tarjeta no abre la cámara ni manda baucher", async () => {
    const result = await montarServicioListo();

    await act(async () => {
      result.current.setPaymentMethod("tarjeta");
    });
    expect(imagePicker.launchCameraAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleSubmit();
    });

    const payload = cuerpoDe("/service-requests");
    expect(payload.metodo_pago).toBe("tarjeta");
    expect(payload).not.toHaveProperty("baucher_foto");
  });
});
