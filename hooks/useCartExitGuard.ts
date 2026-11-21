import { useCallback, useState } from "react";
import { usePreventRemove } from "expo-router";

interface CartExitGuardOptions {
  /** Hay trabajo sin guardar que se perdería al salir. */
  enabled: boolean;
  /** Limpieza que solo debe ejecutarse si el usuario confirma el descarte. */
  onDiscard?: () => void;
}

/**
 * Impide abandonar la pantalla con un carrito cargado y expone el estado del
 * diálogo de confirmación.
 *
 * La intercepción vive en la navegación (`usePreventRemove`), así que cubre el
 * botón del header, el gesto de iOS y el back físico de Android por igual. El
 * botón del header solo debe llamar a `router.back()`.
 */
export function useCartExitGuard({ enabled, onDiscard }: CartExitGuardOptions) {
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);

  usePreventRemove(enabled, ({ repeat }) => {
    // `repeat` vuelve a despachar la navegación bloqueada sin esperar a que el
    // estado de React se vuelva a pintar.
    setPendingExit(() => repeat);
  });

  const confirmDiscard = useCallback(() => {
    const leave = pendingExit;
    setPendingExit(null);
    onDiscard?.();
    leave?.();
  }, [onDiscard, pendingExit]);

  const cancelDiscard = useCallback(() => setPendingExit(null), []);

  return {
    discardPromptVisible: pendingExit !== null,
    confirmDiscard,
    cancelDiscard,
  };
}
