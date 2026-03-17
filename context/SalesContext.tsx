import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface Venta {
  id?: string;
  id_venta: string;
  codigo: string;
  cliente_nombre: string;
  habitacion_nombre: string;
  habitacion_id: string;
  total: number;
  estado: number;
  metodo_pago: string;
  created_at: string;
}

interface SalesContextType {
  ventas: Venta[];
  loading: boolean;
  refreshVentas: () => Promise<void>;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const eventSourceRef = useRef<EventSource | null>(null);

  const refreshVentas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sales?limit=50`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVentas(data.data);
      }
    } catch (error) {
  
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVentas();

    const subscription = DeviceEventEmitter.addListener("sse_event", (payload: any) => {
      if (payload.type === "sale_created" || payload.type === "new_sale" || payload.type === "sale_updated") {
        if (payload.data && payload.type !== "sale_updated") {
          setVentas(prev => [payload.data, ...prev]);
        } else {
          refreshVentas();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshVentas]);

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
