import { useCallback, useState } from 'react';
import { adjuntarBaucher } from '@/utils/baucherPicker';

/**
 * Maneja el estado y la captura de foto de baucher para pagos por transferencia.
 *
 * Uso:
 *   const { baucherFoto, takeBaucherPhoto } = useBaucherPhoto('MiPantalla');
 */
export function useBaucherPhoto(context: string) {
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);

  const takeBaucherPhoto = useCallback(async () => {
    const dataUrl = await adjuntarBaucher(`${context}:takeBaucherPhoto`);
    if (dataUrl) setBaucherFoto(dataUrl);
  }, [context]);

  const resetBaucherFoto = useCallback(() => {
    setBaucherFoto(null);
  }, []);

  return {
    baucherFoto,
    setBaucherFoto,
    takeBaucherPhoto,
    resetBaucherFoto,
  };
}
