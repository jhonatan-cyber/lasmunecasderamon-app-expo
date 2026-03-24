import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { apiClient } from "@/api/client";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

export interface Anticipo {
  id_solicitud: number | string;
  usuario_id: number | string;
  fecha_crea: string;
  fecha_mod: string | null;
  monto: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
  estado_texto: string;
  usuario?: string;
  motivo?: string;
  motivo_rechazo?: string;
}

export function useAnticipos() {
  const [solicitudes, setSolicitudes] = useState<Anticipo[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const [montoMaximo, setMontoMaximo] = useState(0);
  const [montoAsistencia, setMontoAsistencia] = useState(0);
  const [montoComisiones, setMontoComisiones] = useState(0);
  const [montoPropinas, setMontoPropinas] = useState(0);

  const fetchAnticipos = useCallback(async (isManual = false) => {
    try {
      setError('');
      const [solicitudesRes, pagosRes] = await Promise.all([
        apiClient('/anticipos/solicitudes'),
        apiClient('/anticipos/user'),
      ]);
      if (solicitudesRes.success) setSolicitudes(solicitudesRes.data || []);
      if (pagosRes.success) setPagos(pagosRes.data || []);
      
      if (isManual) {
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Datos actualizados' });
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMaximo = useCallback(async () => {
    try {
      const response = await apiClient('/anticipos/maximo');
      if (response.success && response.data) {
        setMontoAsistencia(response.data.monto_asistencia || 0);
        setMontoComisiones(response.data.monto_comisiones || 0);
        setMontoPropinas(response.data.monto_propinas || 0);
        setMontoMaximo(response.data.monto_maximo || 0);
        return response.data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, []);

  const solicitarAnticipo = async (monto: number, motivo: string) => {
    try {
      const response = await apiClient('/anticipos/solicitudes', {
        method: 'POST',
        body: JSON.stringify({ monto, motivo }),
      });
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Solicitud enviada correctamente' });
        fetchAnticipos();
        return true;
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: response.message || 'Error al enviar solicitud' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error de conexión' });
    }
    return false;
  };

  useEffect(() => {
    fetchAnticipos();
  }, [fetchAnticipos]);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchAnticipos(true);
  }, [fetchAnticipos]);

  return {
    solicitudes,
    pagos,
    loading,
    refreshing,
    error,
    montoMaximo,
    montoAsistencia,
    montoComisiones,
    montoPropinas,
    fetchAnticipos,
    fetchMaximo,
    solicitarAnticipo,
    onRefresh
  };
}

