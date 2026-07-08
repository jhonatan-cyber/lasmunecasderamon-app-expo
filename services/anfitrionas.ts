import { apiClientSafe } from '@/api/client-safe';

export const anfitrionasService = {
  list: () =>
    apiClientSafe('/anfitrionas'),

  listDisponibles: () =>
    apiClientSafe('/anfitrionas/disponibles'),
};
