import { useSyncExternalStore } from 'react';

/**
 * Modales nativos abiertos en este momento.
 *
 * Un `Modal` de React Native vive en su propia ventana y siempre queda por
 * encima del árbol raíz, así que el banner de notificaciones no se vería si
 * siguiera montado solo ahí. `AppModal` suma uno al abrirse y lo resta al
 * cerrarse; con al menos uno abierto, la raíz cede el banner y cada modal
 * muestra el suyo dentro de su propia ventana.
 */
let openModals = 0;
const listeners = new Set<() => void>();

function subscriptionFor(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setModalLayerOpen(open: boolean): void {
  const next = Math.max(0, openModals + (open ? 1 : -1));
  if (next === openModals) return;
  openModals = next;
  for (const listener of listeners) listener();
}

export function useModalLayerOpen(): boolean {
  return useSyncExternalStore(subscriptionFor, () => openModals > 0, () => false);
}
