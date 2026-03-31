import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { apiClient } from "@/api/client";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

export interface Servicio {
  id_servicio: number;
  codigo: string;
  tiempo: number;
  fecha_crea: string;
  precio_servicio: number;
  precio_habitacion?: number;
  total?: number;
  metodo_pago?: string;
  creado_por?: string;
  comision_usuario: number;
  habitacion: string;
  anfitriona: string;
  cliente: string;
  estado: number;
  pago_estado?: number;
  habitacion_comision?: number;
}

export function useServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isManual = false) => {
    try {
      setError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await apiClient('/servicios/user', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.success) {
        setServicios(res.data || []);
        if (isManual) {
          Toast.show({ type: 'success', text1: 'Sincronizado', text2: 'Datos actualizados desde el servidor' });
        }
      } else {
        setError(res.message || 'Error al cargar servicios');
      }
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? 'Tiempo de espera agotado' : (err.message || 'Error de conexión');
      setError(msg);
      if (isManual) Toast.show({ type: 'error', text1: 'Fallo de conexión', text2: msg });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleAssistance = async (servicioId: number, roomName: string, type: string) => {
    try {
      const res = await apiClient('/notifications/assistance', {
        method: 'POST',
        body: JSON.stringify({ servicioId, roomName, type })
      });
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Solicitud enviada', text2: `Se ha solicitado ${type} para la habitación ${roomName}` });
        return true;
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar la solicitud' });
    }
    return false;
  };

  return {
    servicios,
    loading,
    refreshing,
    error,
    onRefresh,
    handleAssistance,
    fetchData
  };
}

