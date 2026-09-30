import { useRouter } from 'expo-router';
import React from 'react';

import { PendingOperationsScreen } from '@/components/offline/PendingOperationsScreen';

/**
 * Operaciones que el barman hizo en este dispositivo y que el servidor todavía
 * no confirmó. El listado, el reintento y el descarte viven en la pantalla
 * compartida; acá solo se fija el rol.
 */
export default function PendientesScreen() {
    const router = useRouter();

    return (
        <PendingOperationsScreen
            title='Pendientes de envío'
            emptySubtitle='Las operaciones que hagas sin conexión van a aparecer acá hasta que el servidor las confirme.'
            createsWorkOffline={false}
            onBack={() => router.back()}
        />
    );
}
