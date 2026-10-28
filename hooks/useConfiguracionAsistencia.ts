import { apiClientSafe } from '@/api/client';
import { httpDetailsOf } from '@/api/errors';
import {
  normalizarVentana,
  VENTANA_ASISTENCIA_DEFECTO,
  ventanaValida,
  type VentanaAsistencia,
} from '@/utils/asistenciaConfig';
import logger from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';

/** Pantalla (kiosko) vinculada a la asistencia, según `/kiosk/devices`. */
export interface PantallaAsistencia {
  id: string;
  nombre: string;
  ultimo_uso: string;
  expira_en: string;
  revocado_en: string | null;
  activo: boolean;
}

/** Categoría bajo la que el dashboard agrupa las claves de asistencia. */
const CONFIG_CATEGORY = 'asistencia';

/**
 * Capa de datos de la vista de configuración de asistencia (exclusiva de
 * administradores): lee y guarda la ventana de asistencia y lista/desvincula las
 * pantallas de kiosko.
 *
 * Los endpoints reutilizan los del dashboard, que ya exigen rol administrador
 * (`/kiosk/*`) o permiso de escritura del módulo settings (`PUT /configurations`),
 * así que el servidor rechaza a cualquier usuario no autorizado aunque llegue a
 * invocar estas llamadas.
 */
export function useConfiguracionAsistencia() {
  const [ventana, setVentana] = useState<VentanaAsistencia>(VENTANA_ASISTENCIA_DEFECTO);
  const [guardada, setGuardada] = useState<VentanaAsistencia>(VENTANA_ASISTENCIA_DEFECTO);
  const [loadingVentana, setLoadingVentana] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pantallas, setPantallas] = useState<PantallaAsistencia[]>([]);
  const [loadingPantallas, setLoadingPantallas] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [errorPantallas, setErrorPantallas] = useState('');
  const [revocando, setRevocando] = useState<string | null>(null);

  const cargarVentana = useCallback(async () => {
    setLoadingVentana(true);
    try {
      const res = await apiClientSafe<Record<string, Record<string, unknown>>>('/configurations');
      const grupo = res?.data?.[CONFIG_CATEGORY];
      const siguiente = normalizarVentana(grupo);
      setVentana(siguiente);
      setGuardada(siguiente);
    } catch (error) {
      logger.captureException(error, { context: 'useConfiguracionAsistencia:ventana' });
    } finally {
      setLoadingVentana(false);
    }
  }, []);

  const cargarPantallas = useCallback(async () => {
    setLoadingPantallas(true);
    setErrorPantallas('');
    try {
      const res = await apiClientSafe<PantallaAsistencia[]>('/kiosk/devices');
      if (!res?.success || !Array.isArray(res.data)) {
        throw new Error('No se pudieron cargar las pantallas.');
      }
      setPantallas(res.data);
      setAllowed(true);
    } catch (error) {
      // 401/403: el servidor no reconoce permisos de administrador. No es un
      // error de red, así que la sección se oculta en vez de mostrar el fallo.
      const status = httpDetailsOf(error)?.status;
      if (status === 401 || status === 403) {
        setAllowed(false);
      } else {
        setErrorPantallas(error instanceof Error ? error.message : 'Error de conexión.');
      }
    } finally {
      setLoadingPantallas(false);
    }
  }, []);

  useEffect(() => {
    void cargarVentana();
    void cargarPantallas();
  }, [cargarVentana, cargarPantallas]);

  const guardarVentana = useCallback(async (): Promise<boolean> => {
    if (!ventanaValida(ventana)) return false;

    setSaving(true);
    try {
      const configs = [
        { clave: 'asistencia_hora_inicio', valor: String(ventana.asistencia_hora_inicio) },
        { clave: 'asistencia_minuto_inicio', valor: String(ventana.asistencia_minuto_inicio) },
        { clave: 'asistencia_hora_fin', valor: String(ventana.asistencia_hora_fin) },
        { clave: 'asistencia_minuto_fin', valor: String(ventana.asistencia_minuto_fin) },
      ];

      const res = await apiClientSafe('/configurations', {
        method: 'PUT',
        body: JSON.stringify({ configs }),
      });
      if (res?.success === false) return false;

      setGuardada({ ...ventana });
      return true;
    } catch (error) {
      logger.captureException(error, { context: 'useConfiguracionAsistencia:guardar' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [ventana]);

  const revocarPantalla = useCallback(
    async (id: string): Promise<boolean> => {
      setRevocando(id);
      try {
        const res = await apiClientSafe(`/kiosk/devices/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res?.success === false) return false;

        await cargarPantallas();
        return true;
      } catch (error) {
        logger.captureException(error, { context: 'useConfiguracionAsistencia:revocar' });
        return false;
      } finally {
        setRevocando(null);
      }
    },
    [cargarPantallas],
  );

  const sucio = (Object.keys(ventana) as (keyof VentanaAsistencia)[]).some(
    (clave) => ventana[clave] !== guardada[clave],
  );

  return {
    ventana,
    setVentana,
    guardada,
    sucio,
    valida: ventanaValida(ventana),
    loadingVentana,
    saving,
    guardarVentana,
    pantallas,
    loadingPantallas,
    allowed,
    errorPantallas,
    revocando,
    cargarPantallas,
    revocarPantalla,
  };
}
