import { useRouter } from 'expo-router';
import React from 'react';

import { PendingOperationsScreen } from '@/components/offline/PendingOperationsScreen';

export default function PendientesScreen() {
    const router = useRouter();

    return (
        <PendingOperationsScreen
            title='Pendientes de envío'
            createsWorkOffline={false}
            onBack={() => router.back()}
        />
    );
}
