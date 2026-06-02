import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiClient } from "@/api/client";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

import { AnticipoRequestSchema } from '@lasmunecasderamon/validations';

import logger from '@/utils/logger';
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
  const [tieneSolicitudPendiente, setTieneSolicitudPendiente] = useState(false);

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
        setTieneSolicitudPendiente(response.data.tiene_solicitud_pendiente || false);
        return response.data;
      }
    } catch (e) {
      logger.captureException(e, { context: 'useAnticipos:fetchMaximo' });
    }
    return null;
  }, []);

  const solicitarAnticipo = async (monto: number, motivo: string) => {
    const validation = AnticipoRequestSchema.safeParse({ monto, motivo });

    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Datos inválidos';
      Toast.show({ type: 'warning', text1: 'Atención', text2: msg });
      return false;
    }

    const { monto: montoVal, motivo: motivoVal } = validation.data;

    try {
      const response = await apiClient('/anticipos/solicitudes', {
        method: 'POST',
        body: JSON.stringify({ monto: montoVal, motivo: motivoVal }),
      });
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Solicitud enviada correctamente' });
        fetchAnticipos();
        return true;
      } else {
        Toast.show({ type: 'warning', text1: 'Atención', text2: response.message || 'No se pudo enviar la solicitud' });
      }
    } catch (error: any) {
      const mensaje = error?.message || 'Error de conexión';
      Toast.show({ type: 'error', text1: 'Error', text2: mensaje });
    }
    return false;
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnticipos();
      fetchMaximo();
    }, [fetchAnticipos, fetchMaximo])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refresh_anticipos', () => {
      fetchAnticipos();
    });

    return () => subscription.remove();
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
    tieneSolicitudPendiente,
    fetchAnticipos,
    fetchMaximo,
    solicitarAnticipo,
    onRefresh
  };
}

