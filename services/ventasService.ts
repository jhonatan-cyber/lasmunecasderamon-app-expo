import { apiClientSafe } from '@/api/client-safe';
import type { Venta, VentaDetail, VentaResumen } from "@/components/cajero/ventas/types";
import logger from "@/utils/logger";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export async function fetchSalesList(
  limit = 50,
  signal?: AbortSignal,
): Promise<{ ventas: Venta[]; resumen: VentaResumen | null }> {
  try {
    const timestamp = Date.now();
    const [resSales, resResumen] = await Promise.all([
      apiClientSafe(`/sales?limit=${limit}&_t=${timestamp}`, { signal }).catch(() => ({
        success: false as const,
        data: [],
      })),
      apiClientSafe(`/sales?tipo=resumen&_t=${timestamp}`, { signal }).catch(() => ({
        success: false as const,
        data: null,
      })),
    ]);

    const ventas: Venta[] = Array.isArray(resSales.data)
      ? (resSales.data as Venta[])
      : Array.isArray((resSales.data as any)?.data)
        ? (resSales.data as any).data as Venta[]
        : [];

    const resumen: VentaResumen | null = resResumen.success
      ? (resResumen.data as VentaResumen)
      : null;

    return { ventas, resumen };
  } catch (error) {
    logger.captureException(error, { context: "VentasService:fetchSalesList" });
    return { ventas: [], resumen: null };
  }
}

export async function fetchVentaDetail(
  id: string | number,
  signal?: AbortSignal,
): Promise<VentaDetail | null> {
  try {
    const res = await apiClientSafe(`/sales/${id}`, { signal });
    if (res?.success && res.data) {
      return res.data as VentaDetail;
    }
    return null;
  } catch (error) {
    logger.captureException(error, { context: "VentasService:fetchVentaDetail" });
    return null;
  }
}

export async function finalizarVenta(
  ventaId: string | number | null,
): Promise<{ success: boolean; message?: string }> {
  if (!ventaId) return { success: false, message: "ID de venta no válido" };

  try {
    const res = await apiClientSafe(`/sales/${ventaId}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: 1 }),
    });

    if (res.success || (res && !res.error)) {
      return { success: true };
    }
    return {
      success: false,
      message: res.message || res.error || "No se pudo finalizar la venta",
    };
  } catch {
    return { success: false, message: "Error al procesar la finalización" };
  }
}

export async function enviarSolicitudAnulacion(
  ventaId: string | number | null,
  motivo: string,
  monto: number,
): Promise<{ success: boolean; message?: string }> {
  if (!ventaId) {
    return { success: false, message: "No se pudo identificar la venta." };
  }

  try {
    const res = await apiClientSafe("/ventas/anulacion", {
      method: "POST",
      body: JSON.stringify({ ventaId, motivo, monto }),
    });

    if (res.success || !res.error) {
      return { success: true };
    }
    return {
      success: false,
      message:
        res.message || res.error || "No se pudo solicitar la anulación",
    };
  } catch {
    return {
      success: false,
      message: "Error al procesar la solicitud de anulación",
    };
  }
}
