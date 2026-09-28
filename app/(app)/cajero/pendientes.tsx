import { useRouter } from 'expo-router';
import React from 'react';

import { PendingOperationsScreen } from '@/components/offline/PendingOperationsScreen';

/**
 * Operaciones del cajero que el servidor todavía no confirmó: ventas y consumos
 * encolados sin red, más lo que el servidor rechazó al sincronizar.
 *
 * El cajero no puede abrir ni cerrar caja sin conexión, así que acá no se
 * promete que todo lo que haga saldrá solo.
 */
export default function CajeroPendientesScreen() {
    const router = useRouter();

    return (
        <PendingOperationsScreen
            title='Pendientes de envío'
            emptySubtitle='Las ventas y los consumos que hagas sin conexión van a aparecer acá hasta que el servidor los confirme. Abrir o cerrar la caja sí necesita conexión.'
            createsWorkOffline={false}
            onBack={() => router.back()}
        />
    );
}
