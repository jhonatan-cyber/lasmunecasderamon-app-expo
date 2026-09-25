import { apiClientSafe } from "@/api/client";
import { REALTIME_EVENT_NAMES, shouldRefreshSalesFromSse } from "@/utils/realtime";
import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect } from "react";
import { eventBus } from "@/utils/eventBus";
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

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  });

  const refreshVentas = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    const subscription = eventBus.addListener(REALTIME_EVENT_NAMES.sseEvent, (payload: { type?: string; data?: Venta }) => {
      if (!shouldRefreshSalesFromSse(payload?.type)) {
        return;
      }

      // updateSales trae { id, type } y sale_cancelled trae { ventaId, total }:
      // ninguno es una Venta completa, así que siempre se refetchea la lista.
      void refetch();
    });

    return () => {
      subscription.remove();
    };
  }, [refetch]);

  return (
    <SalesContext.Provider value={{ ventas, loading, refreshVentas }}>
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
};
