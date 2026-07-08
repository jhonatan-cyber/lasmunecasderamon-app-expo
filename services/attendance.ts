import { apiClientSafe } from '@/api/client-safe';

export const attendanceService = {
  userDetail: (startDate: string, endDate: string) =>
    apiClientSafe(`/attendance/user?tipo=detalle&startDate=${startDate}&endDate=${endDate}`),

  register: (data: Record<string, unknown>) =>
    apiClientSafe('/attendance/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
