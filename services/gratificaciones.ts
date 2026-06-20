import { apiClient } from '@/api/client';

export const gratificacionesService = {
  me: () =>
    apiClient('/gratificaciones/me'),
};
