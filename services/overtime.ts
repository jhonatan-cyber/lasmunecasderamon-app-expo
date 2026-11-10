import { apiClientSafe } from '@/api/client-safe';

export interface CreateHoraExtraPayload {
  usuario_id: string;
  hora: number;
  monto: number;
  device_date: string;
}

export const overtimeService = {
  list: () =>
    apiClientSafe('/overtime'),

  user: () =>
    apiClientSafe('/overtime/user'),

  create: (data: CreateHoraExtraPayload) =>
    apiClientSafe('/overtime', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
