import React from 'react';

import { OfflineStatusBanner } from '@/components/offline/OfflineStatusBanner';

/**
 * Aviso del modo offline del barman: la variante de `OfflineStatusBanner` que
 * abre su pantalla de pendientes.
 */
export const BarmanOfflineBanner: React.FC = () => (
    <OfflineStatusBanner pendientesHref={'/(app)/barman/pendientes' as never} />
);
