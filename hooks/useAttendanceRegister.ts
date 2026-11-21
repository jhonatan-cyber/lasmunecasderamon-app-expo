import { useCallback, useState } from 'react';
import { apiClientSafe } from '@/api/client';
import { AttendanceRegisterSchema } from '@lasmunecasderamon/validations';
import { showToast } from '@/utils/toast-lazy';

interface AttendanceRegisterResponse {
    success: boolean;
    alreadyRegistered?: boolean;
    message?: string;
}

/**
 * Hook compartido para registrar asistencia por código o QR.
 * Elimina la duplicación entre código manual y QR escaneado.
 */
export function useAttendanceRegister(onRegistered: () => void) {
    const [loading, setLoading] = useState(false);

    const register = useCallback(async (qrData: string) => {
        const validation = AttendanceRegisterSchema.safeParse({ qrData });

        if (!validation.success) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: validation.error.issues[0]?.message || 'Código de asistencia inválido'
            });
            return;
        }

        setLoading(true);
        try {
            const res = await apiClientSafe('/attendance/register', {
                method: 'POST',
                body: JSON.stringify({ qr_data: validation.data.qrData })
            });
            const attData = res as unknown as AttendanceRegisterResponse;

            if (attData.success) {
                if (attData.alreadyRegistered) {
                    showToast({
                        type: 'warning',
                        text1: 'Ya tienes asistencia',
                        text2: attData.message || 'Ya tenías asistencia registrada hoy'
                    });
                } else {
                    showToast({
                        type: 'success',
                        text1: 'Asistencia Registrada',
                        text2: attData.message || 'Tu asistencia ha sido registrada correctamente'
                    });
                }
                onRegistered();
            } else {
                throw new Error(attData.message || 'Código inválido');
            }
        } catch (error: any) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo registrar la asistencia'
            });
        } finally {
            setLoading(false);
        }
    }, [onRegistered]);

    return { loading, register };
}
