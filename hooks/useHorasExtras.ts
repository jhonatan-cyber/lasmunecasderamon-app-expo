import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiClient } from "@/api/client";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

export interface HoraExtra {
  id_hora_extra: number;
  fecha_crea: string;
  fecha_mod: string | null;
  hora: string;
  monto: number;
  total: number;
  estado: number; 
}

export function useHorasExtras() {
  const [data, setData] = useState<HoraExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isManual = false) => {
    try {
      setError('');
      const res = await apiClient('/overtime/user');
      if (res.success) {
        setData(res.data || []);
        if (isManual) {
          Toast.show({
            type: 'success',
            text1: 'Éxito',
            text2: 'Datos actualizados',
          });
        }
      } else {
        setError(res.message || 'Error al cargar horas extras');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    onRefresh,
    fetchData
  };
}
