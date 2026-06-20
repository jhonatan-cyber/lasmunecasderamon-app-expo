import { apiClient } from '@/api/client';

export const codigoService = {
  actual: () =>
    apiClient('/codigo/actual'),
};
