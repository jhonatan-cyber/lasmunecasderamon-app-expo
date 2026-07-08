import { apiClientSafe } from '@/api/client-safe';

export const codigoService = {
  actual: () =>
    apiClientSafe('/codigo/actual'),
};
