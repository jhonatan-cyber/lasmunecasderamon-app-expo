import { apiClientSafe } from '@/api/client-safe';

export const attendanceService = {
  /** Asistencias registradas hoy (ruta pública): permite saber si el usuario actual ya registró. */
  hoy: () => apiClientSafe('/attendance/hoy'),

  userDetail: (startDate: string, endDate: string) =>
    apiClientSafe(`/attendance/user?tipo=detalle&startDate=${startDate}&endDate=${endDate}`),

  register: (data: Record<string, unknown>) =>
    apiClientSafe('/attendance/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
