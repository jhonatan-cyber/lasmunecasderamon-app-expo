import { apiClientSafe } from '@/api/client-safe';

export const anfitrionasService = {
  list: () =>
    apiClientSafe('/hostesses'),

  listDisponibles: () =>
    apiClientSafe('/hostesses/available'),
};
