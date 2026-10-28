import * as ImagePicker from 'expo-image-picker';

import { showToast } from '@/utils/toast-lazy';
import logger from '@/utils/logger';
import { ajustarFotoBaucher } from './baucherFoto';

export type OrigenBaucher = 'camara' | 'galeria';

export type ResultadoBaucher =
    | { ok: true; dataUrl: string }
    | { ok: false; motivo: 'cancelado' }
    | { ok: false; motivo: 'sin-permiso'; origen: OrigenBaucher; puedeReintentar: boolean }
    | { ok: false; motivo: 'no-cabe' | 'no-se-pudo' };


function leerPermiso(permiso: { granted?: boolean; status?: string; canAskAgain?: boolean }) {
    return {
        concedido: permiso.granted ?? permiso.status === 'granted',
        puedeReintentar: permiso.canAskAgain ?? true,
    };
}

async function pedirPermiso(origen: OrigenBaucher) {
    const permiso =
        origen === 'camara'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

    return leerPermiso(permiso);
}

const OPCIONES_CAPTURA = {
    mediaTypes: ['images'] as ['images'],
    quality: 0.4,
    base64: true,
};

export async function capturarFotoBaucher(
    origen: OrigenBaucher = 'camara'
): Promise<ResultadoBaucher> {
    const permiso = await pedirPermiso(origen);
    if (!permiso.concedido) {
        return { ok: false, motivo: 'sin-permiso', origen, puedeReintentar: permiso.puedeReintentar };
    }

    const result =
        origen === 'camara'
            ? await ImagePicker.launchCameraAsync(OPCIONES_CAPTURA)
            : await ImagePicker.launchImageLibraryAsync(OPCIONES_CAPTURA);

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return { ok: false, motivo: 'cancelado' };

    const ajuste = await ajustarFotoBaucher(`data:image/jpeg;base64,${asset.base64}`, asset.uri);
    if (!ajuste.ok) return { ok: false, motivo: ajuste.motivo };

    return { ok: true, dataUrl: ajuste.dataUrl };
}


export async function pedirFotoBaucher(): Promise<ResultadoBaucher> {
    const porCamara = await capturarFotoBaucher('camara');
    if (porCamara.ok || porCamara.motivo !== 'sin-permiso') return porCamara;

    return capturarFotoBaucher('galeria');
}

export async function adjuntarBaucher(contexto: string): Promise<string | null> {
    try {
        const resultado = await pedirFotoBaucher();
        if (resultado.ok) return resultado.dataUrl;
        if (resultado.motivo === 'cancelado') return null;
        if (resultado.motivo === 'sin-permiso') {
            showToast({
                type: 'error',
                text1: 'Sin acceso a la cámara ni a la galería',
                text2: resultado.puedeReintentar
                    ? 'Concede el permiso para adjuntar el baucher de la transferencia.'
                    : 'El permiso quedó bloqueado. Actívalo en los ajustes del teléfono para adjuntar el baucher.',
                visibilityTime: 5000,
            });
            return null;
        }

        showToast({
            type: 'error',
            text1: 'La foto del baucher no sirve',
            text2:
                resultado.motivo === 'no-cabe'
                    ? 'No entra en el tamaño permitido. Tómala de nuevo con más luz y sin zoom.'
                    : 'No se pudo reducir la foto. Tómala de nuevo.',
        });
        return null;
    } catch (error) {
        logger.fetchError(error, { context: `${contexto}:adjuntarBaucher` });
        showToast({
            type: 'error',
            text1: 'No se pudo abrir la cámara',
            text2: 'Vuelve a intentar adjuntar el baucher.',
        });
        return null;
    }
}
