import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import logger from '@/utils/logger';

/** Ruta de la vista que queda fijada mientras el dispositivo es una pantalla. */
export const RUTA_PANTALLA_ASISTENCIA = '/(app)/cajero/pantalla-asistencia';

/**
 * `true` si los segmentos corresponden a la vista de pantalla de asistencia.
 *
 * El layout de `(app)` lo usa para confinar la navegación: mientras el modo
 * pantalla está activo, cualquier otra ruta se redirige acá.
 */
export function esRutaPantallaAsistencia(segmentos: readonly string[]): boolean {
  return segmentos[segmentos.length - 1] === 'pantalla-asistencia';
}

const STORAGE_KEY = 'modoPantallaAsistencia';

interface ModoPantallaPersistido {
  nombre: string;
}

interface ModoPantallaState {
  /** El dispositivo quedó configurado como pantalla de asistencia. */
  activo: boolean;
  /** Nombre con el que se vinculó la pantalla (para mostrarlo en la cabecera). */
  nombre: string | null;
  /** La lectura de disco terminó: evita decidir la navegación antes de tiempo. */
  cargado: boolean;
  activar: (nombre: string) => Promise<void>;
  desactivar: () => Promise<void>;
  cargar: () => Promise<void>;
}

function parsePersistido(raw: string | null): ModoPantallaPersistido | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ModoPantallaPersistido>;
    if (typeof parsed?.nombre !== 'string' || parsed.nombre.trim().length === 0) return null;
    return { nombre: parsed.nombre };
  } catch {
    return null;
  }
}

/**
 * Estado del "modo pantalla": el dispositivo deja de ser un puesto de trabajo y
 * pasa a mostrar la asistencia del personal.
 *
 * La sesión se conserva internamente porque la emisión de los QR y la lectura
 * del código del local exigen credencial de usuario; lo que se bloquea es la
 * navegación, no el token. Al salir se cierra la sesión de verdad.
 */
export const useModoPantallaStore = create<ModoPantallaState>((set) => ({
  activo: false,
  nombre: null,
  cargado: false,

  activar: async (nombre) => {
    set({ activo: true, nombre });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ nombre }));
    } catch (error) {
      logger.captureException(error, { context: 'modoPantallaStore:activar' });
    }
  },

  desactivar: async () => {
    set({ activo: false, nombre: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.captureException(error, { context: 'modoPantallaStore:desactivar' });
    }
  },

  cargar: async () => {
    try {
      const persistido = parsePersistido(await AsyncStorage.getItem(STORAGE_KEY));
      set({ activo: persistido !== null, nombre: persistido?.nombre ?? null, cargado: true });
    } catch (error) {
      logger.captureException(error, { context: 'modoPantallaStore:cargar' });
      set({ activo: false, nombre: null, cargado: true });
    }
  },
}));
