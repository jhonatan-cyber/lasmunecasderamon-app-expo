import React from 'react';

import { OfflineStatusBanner } from '@/components/offline/OfflineStatusBanner';
import { useAuthStore } from '@/store/authStore';
import { isBarmanRole } from '@/utils/userRole';

/**
 * Aviso del modo offline del garzón: la variante de `OfflineStatusBanner` que
 * abre su pantalla de pendientes.
 */
export const GarzonOfflineBanner: React.FC = () => {
    const isBarman = isBarmanRole(useAuthStore((state) => state.user));
    return <OfflineStatusBanner pendientesHref={(isBarman ? '/(app)/barman/pendientes' : '/(app)/garzon/pendientes') as never} />;
};
