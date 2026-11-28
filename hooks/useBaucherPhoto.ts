import { useCallback, useState } from 'react';
import { adjuntarBaucher } from '@/utils/baucherPicker';

interface ControlledBaucherPhoto {
  baucherFoto: string | null;
  setBaucherFoto: (foto: string | null) => void;
}

/**
 * Maneja el estado y la captura de foto de baucher para pagos por transferencia.
 *
 * Uso:
 *   const { baucherFoto, takeBaucherPhoto } = useBaucherPhoto('MiPantalla');
 */
export function useBaucherPhoto(
  context: string,
  controlledPhoto?: ControlledBaucherPhoto,
) {
  const [localBaucherFoto, setLocalBaucherFoto] = useState<string | null>(null);
  const baucherFoto = controlledPhoto
    ? controlledPhoto.baucherFoto
    : localBaucherFoto;
  const setBaucherFoto = controlledPhoto?.setBaucherFoto ?? setLocalBaucherFoto;

  const takeBaucherPhoto = useCallback(async () => {
    const dataUrl = await adjuntarBaucher(`${context}:takeBaucherPhoto`);
    if (dataUrl) setBaucherFoto(dataUrl);
  }, [context, setBaucherFoto]);

  const resetBaucherFoto = useCallback(() => {
    setBaucherFoto(null);
  }, [setBaucherFoto]);

  return {
    baucherFoto,
    setBaucherFoto,
    takeBaucherPhoto,
    resetBaucherFoto,
  };
}
