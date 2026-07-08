import { apiClient } from "@/api/client";
import { REALTIME_EVENT_NAMES, shouldRefreshSalesFromSse } from "@/utils/realtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect } from "react";
import { DeviceEventEmitter } from "react-native";
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
  const queryClient = useQueryClient();

  const {
    data: ventas = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const data = await apiClient("/sales?limit=50");
      return data.success && Array.isArray(data.data) ? data.data : [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const refreshVentas = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(REALTIME_EVENT_NAMES.sseEvent, (payload: { type?: string; data?: Venta }) => {
      if (!shouldRefreshSalesFromSse(payload?.type)) {
        return;
      }

      if (payload.data && payload.type !== "sale_updated") {
        queryClient.setQueryData<Venta[]>(["sales"], (prev) => [payload.data!, ...(prev || [])]);
      } else {
        void refetch();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [queryClient, refetch]);

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
