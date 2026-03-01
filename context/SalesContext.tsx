import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import EventSource from "react-native-sse";
import { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface Venta {
  id?: number;
  id_venta: number;
  codigo: string;
  cliente_nombre: string;
  habitacion_nombre: string;
  habitacion_id: number;
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
      console.error("[SalesContext] Error fetching ventas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    refreshVentas();

    const sseUrl = `${API_URL}/notifications/sse`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("message", (event: any) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "sale_created" || payload.type === "new_sale") {
            if (payload.data) {
              setVentas(prev => [payload.data, ...prev]);
            } else {
              refreshVentas();
            }
          }
        } catch (err) {
          console.error("[SalesContext] SSE parse error:", err);
        }
      });

      es.addEventListener("error", () => {});
    } catch (err) {
      console.error("[SalesContext] SSE init error:", err);
    }

    return () => {
      if (es) {
        es.close();
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, refreshVentas]);

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
