import React from 'react';

import { OfflineStatusBanner } from '@/components/offline/OfflineStatusBanner';

/**
 * Aviso del modo offline del garzón: la variante de `OfflineStatusBanner` que
 * abre su pantalla de pendientes.
 */
export const GarzonOfflineBanner: React.FC = () => (
    <OfflineStatusBanner pendientesHref={'/(app)/garzon/pendientes' as never} />
);
