import { apiClientSafe } from '@/api/client-safe';

export const gratificacionesService = {
  me: () =>
    apiClientSafe('/gratifications/me'),
};
