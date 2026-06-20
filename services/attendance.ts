import { apiClient } from '@/api/client';

export const attendanceService = {
  userDetail: (startDate: string, endDate: string) =>
    apiClient(`/attendance/user?tipo=detalle&startDate=${startDate}&endDate=${endDate}`),

  register: (payload: any) =>
    apiClient('/attendance/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
