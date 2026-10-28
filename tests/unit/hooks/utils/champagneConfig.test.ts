import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La app móvil deja agregar consumos a una cuenta desde dos modales. Una
 * champaña sin tabla de precios por anfitrionas (ni máximo explícito) no tiene
 * cómo cobrarse: el guard la rechaza antes de sumarla al carro, con el mismo
 * mensaje que el servidor.
 */

const apiClientSafe = vi.hoisted(() => vi.fn());

vi.mock("@/api/client-safe", () => ({ apiClientSafe }));
vi.mock("@/utils/toast-lazy", () => ({
  default: vi.fn(),
  showToast: vi.fn(),
  hideToast: vi.fn(),
}));

import { bloqueaChampanaSinConfigurar } from "@/hooks/utils/champagneConfig";
import { MENSAJE_CHAMPAGNE_SIN_CONFIGURAR } from "@/hooks/utils/cuentaUtils";

const champana = {
  id: "prod-champ",
  nombre: "Moët",
  precio: 120000,
  comision: 40000,
  categoria: "Champagne",
};

beforeEach(() => {
  apiClientSafe.mockReset();
});

describe("bloqueaChampanaSinConfigurar", () => {
  it("bloquea la champaña sin máximo ni tramos", async () => {
    apiClientSafe.mockResolvedValue({ success: true, data: [] });

    await expect(
      bloqueaChampanaSinConfigurar({ ...champana, max_anfitrionas: null }),
    ).resolves.toBe(true);
    expect(apiClientSafe).toHaveBeenCalledWith(
      "/products/prod-champ/tiers?configurados=1",
    );
  });

  it("deja pasar la champaña con tramos guardados", async () => {
    apiClientSafe.mockResolvedValue({
      success: true,
      data: [{ anfitrionas: 1, precio: 180000, comision: 60000 }],
    });

    await expect(
      bloqueaChampanaSinConfigurar({ ...champana, max_anfitrionas: null }),
    ).resolves.toBe(false);
  });

  it("deja pasar la champaña con máximo explícito sin consultar tramos", async () => {
    await expect(
      bloqueaChampanaSinConfigurar({ ...champana, max_anfitrionas: 3 }),
    ).resolves.toBe(false);
    expect(apiClientSafe).not.toHaveBeenCalled();
  });

  it("no bloquea un shot: se sirve de la botella abierta", async () => {
    await expect(
      bloqueaChampanaSinConfigurar({ ...champana, tipo_venta: "shot" }),
    ).resolves.toBe(false);
    expect(apiClientSafe).not.toHaveBeenCalled();
  });

  it("no bloquea un producto que no es champaña", async () => {
    await expect(
      bloqueaChampanaSinConfigurar({ ...champana, categoria: "Vodka" }),
    ).resolves.toBe(false);
    expect(apiClientSafe).not.toHaveBeenCalled();
  });

  it("sin red no deja agregar la champaña sin verificar su configuración", async () => {
    apiClientSafe.mockRejectedValue(new Error("offline"));

    await expect(
      bloqueaChampanaSinConfigurar({ ...champana, max_anfitrionas: null }),
    ).resolves.toBe(true);
  });

  it("el mensaje es el mismo del servidor", () => {
    expect(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR).toBe(
      "El producto de champaña no tiene configurada la tabla de precios por anfitrionas",
    );
  });
});
