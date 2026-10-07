import { apiClientSafe } from "@/api/client";
import { REALTIME_EVENT_NAMES, shouldRefreshSalesFromSse } from "@/utils/realtime";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useDebouncedEventListener } from "@/hooks/useDebouncedEventListener";
import { MetodoPago } from "../types/api";

export interface Venta {
  id?: string;
  id_venta: string;
  codigo: string;
  cliente_nombre: string;
  habitacion_nombre: string;
  habitacion_id: string;
  total: number;
  estado: number;
  metodo_pago: MetodoPago;
  created_at: string;
}

interface SalesContextType {
  ventas: Venta[];
  loading: boolean;
  refreshVentas: () => Promise<void>;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

/** Acciones estables: quien solo refresca no se re-renderiza con la lista. */
interface SalesActionsContextType {
  refreshVentas: () => Promise<void>;
}

const SalesActionsContext = createContext<SalesActionsContextType | undefined>(undefined);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sin sesión no hay nada que traer (antes fetcheaba pre-login y cosechaba 401).
  const userId = useAuthStore((state) => state.user?.id);
  const {
    data: ventas = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const data = await apiClientSafe<Venta[]>("/sales?limit=50");
      return data.success && Array.isArray(data.data) ? data.data : [];
    },
    staleTime: 1000 * 60 * 2,
    enabled: userId != null,
  });

  const refreshVentas = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Refetch con debounce: en ráfagas, un solo /sales en vez de uno por evento.
  // updateSales trae { id, type } y sale_cancelled trae { ventaId, total }:
  // ninguno es una Venta completa, así que siempre se refetchea la lista.
  useDebouncedEventListener(REALTIME_EVENT_NAMES.sseEvent, (payload: { type?: string; data?: Venta }) => {
    if (!shouldRefreshSalesFromSse((payload as { type?: string })?.type)) {
      return;
    }
    void refetch();
  }, 500);

  const dataValue = useMemo(
    () => ({ ventas, loading }),
    [ventas, loading],
  );
  const actionsValue = useMemo(
    () => ({ refreshVentas }),
    [refreshVentas],
  );

  return (
    <SalesActionsContext.Provider value={actionsValue}>
      <SalesContext.Provider
        value={{ ...dataValue, refreshVentas: actionsValue.refreshVentas }}
      >
        {children}
      </SalesContext.Provider>
    </SalesActionsContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
};

/** Solo acciones (estable): no re-renderiza cuando cambia la lista. */
export const useSalesActions = () => {
  const context = useContext(SalesActionsContext);
  if (context === undefined) {
    throw new Error("useSalesActions must be used within a SalesProvider");
  }
  return context;
};
