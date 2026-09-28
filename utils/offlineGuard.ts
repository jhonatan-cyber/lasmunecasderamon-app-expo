import { connectivity } from '@/services/connectivity';
import { showToast } from '@/utils/toast-lazy';

/**
 * Operaciones que **no** se pueden hacer sin red y por qué.
 *
 * La regla no es "esto escribe, entonces se encola": es que hay operaciones cuyo
 * resultado depende de un estado del servidor que el dispositivo no puede
 * reproducir ni validar. Encolarlas daría una confirmación falsa —el cajero
 * creería que cerró el turno— y encima se aplicarían tarde y mal.
 */
export const OFFLINE_BLOCKED_ACTIONS = {
  caja: {
    title: 'Sin conexión',
    message: 'Abrir, cerrar la caja o registrar un retiro necesita el servidor.',
  },
  prepago: {
    title: 'Sin conexión',
    message: 'Una venta con prepago necesita el servidor para descontar el saldo del cliente.',
  },
  temporizador: {
    title: 'Sin conexión',
    message: 'Finalizar un temporizador necesita el servidor.',
  },
  anulacion: {
    title: 'Sin conexión',
    message: 'Solicitar una anulación necesita el servidor.',
  },
  cuenta: {
    title: 'Sin conexión',
    message: 'Crear o modificar una cuenta necesita el servidor.',
  },
} as const;

export type OfflineBlockedAction = keyof typeof OFFLINE_BLOCKED_ACTIONS;

/**
 * ¿Se puede hacer ahora? Cuando no hay red confirmada avisa con un toast —el
 * motivo, no solo "error"— y devuelve `false` para cortar la operación.
 *
 * Con la conectividad en `unknown` deja pasar: es preferible que el servidor
 * rechace a que el usuario quede bloqueado por un estado sin confirmar.
 */
export function blockOffline(
  action: OfflineBlockedAction,
  isOnline: () => boolean = () => connectivity.isOnline(),
): boolean {
  if (isOnline()) return true;

  const { title, message } = OFFLINE_BLOCKED_ACTIONS[action];
  showToast({ type: 'error', text1: title, text2: message, visibilityTime: 4000 });
  return false;
}
