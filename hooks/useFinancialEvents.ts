import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiClient } from "@/api/client";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

export interface FinancialEvent {
  id: string | number;
  id_comision?: number;
  id_detalle_propina?: number;
  codigo?: string | null;
  codigo_venta?: string | null;
  monto: number;
  comision?: number;
  fecha_crea: string;
  fecha_mod?: string | null;
  propina_fecha_crea?: string | null;
  estado: number; 
  tipo: 'venta' | 'servicio' | 'otro' | 'propina';
  subType?: string;
  cliente_nombre?: string;
  habitacion_nombre?: string;
  productos?: any;
}

export function useFinancialEvents(type: 'comisiones' | 'propinas') {
  const [data, setData] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const dataRef = useRef<string>('');

  const endpoint = type === 'comisiones' ? '/commissions/user' : '/tips?tipo=detalle';

  const fetchData = useCallback(async (isManual = false) => {
    try {
      setError('');
      const res = await apiClient(endpoint);
      if (res.success) {
        
        const filteredData = type === 'comisiones' 
            ? (res.data || []).filter((c: any) => c.tipo === 'venta')
            : (res.data || []);
            
        const serialized = JSON.stringify(filteredData);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;
        setData(filteredData);

        if (isManual) {
          Toast.show({
            type: hasChanges ? 'success' : 'info',
            text1: hasChanges ? 'Éxito' : 'Información',
            text2: hasChanges ? 'Datos actualizados' : 'Sin cambios detectados',
          });
        }
      } else {
        setError(res.message || 'Error al cargar datos');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, endpoint]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    refreshing,
    error,
    onRefresh
  };
}

