import { apiClient } from '@/api/client';

export const anfitrionasService = {
  list: () =>
    apiClient('/anfitrionas'),

  listDisponibles: () =>
    apiClient('/anfitrionas/disponibles'),
};
