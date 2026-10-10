import { useCallback, useRef } from "react";
import { apiClientSafe } from "@/api/client";
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import logger from "@/utils/logger";
import type { CuentaDetalle, CuentaResumen } from "@/hooks/types/cuentaTypes";
import type { CuentasAction } from "./cuentasState";

type Options = {
  refreshing: boolean;
  dispatch: (action: CuentasAction) => void;
  notify: (title: string, message: string, type?: "success" | "error" | "info") => void;
};

/** Loads the account list, summary and cash-register status from the API/mirror. */
export function useCuentasData({ refreshing, dispatch, notify }: Options) {
  const dataRef = useRef("");

  const fetchCuentas = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      if (isManual && !refreshing) dispatch({ type: "SET_LOADING", payload: true });

      const timestamp = Date.now();
      const [cuentasResult, resumenResult, cajaResult] = await Promise.all([
        getMirror().readThroughDetailed(
          MIRROR_KEYS.openAccounts,
          () => apiClientSafe(`/cuentas?limit=50&_t=${timestamp}`, { signal }),
          { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
        ),
        getMirror().readThroughDetailed(
          MIRROR_KEYS.accountsSummary,
          () => apiClientSafe(`/cuentas?tipo=resumen&_t=${timestamp}`, { signal }),
          { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
        ),
        getMirror()
          .readThroughDetailed(
            MIRROR_KEYS.cashregisterStatus,
            () => apiClientSafe('/cashregister/status', { signal }),
            { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
          )
          .catch(() => null),
      ]);

      dispatch({
        type: "SET_FROM_CACHE",
        payload: {
          fromCache: cuentasResult.fromCache || resumenResult.fromCache,
          syncedAt: cuentasResult.syncedAt,
        },
      });

      const resCuentas = cuentasResult.data;
      const resResumen = resumenResult.data;
      const resCaja = cajaResult?.data ?? null;
      const cuentas: CuentaDetalle[] = Array.isArray(resCuentas.data)
        ? (resCuentas.data as CuentaDetalle[])
        : Array.isArray(resCuentas)
          ? (resCuentas as unknown as CuentaDetalle[])
          : [];
      const resumen: CuentaResumen | null =
        (resResumen.data as CuentaResumen | null) ||
        ("total_por_cobrar" in resResumen
          ? (resResumen as unknown as CuentaResumen)
          : null);

      const serialized = JSON.stringify({ cuentas, resumen });
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      if (
        resCaja &&
        typeof resCaja === 'object' &&
        'success' in resCaja &&
        (resCaja as { success?: boolean }).success &&
        typeof (resCaja as { data?: { hasOpenCaja?: boolean } }).data?.hasOpenCaja === 'boolean'
      ) {
        dispatch({
          type: "SET_CAJA_ABIERTA",
          payload: Boolean((resCaja as { data: { hasOpenCaja: boolean } }).data.hasOpenCaja),
        });
      }

      dispatch({ type: "SET_DATA", payload: { cuentas, resumen } });

      if (isManual) {
        notify(
          hasChanges ? "Éxito" : "Información",
          hasChanges ? "Datos actualizados" : "Sin cambios",
          hasChanges ? "success" : "info",
        );
      }
    } catch (error) {
      logger.fetchError(error, { context: "Cuentas:fetchCuentas" });
      if (isManual) notify("Error", "No se pudo actualizar");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, [dispatch, notify, refreshing]);

  return { fetchCuentas };
}
