import { apiClient } from '@/api/client';

export const tipsService = {
  userDetail: () =>
    apiClient('/tips/user?tipo=detalle'),

  allDetail: () =>
    apiClient('/tips?tipo=detalle'),

  getById: (id: string | number) =>
    apiClient(`/tips/${id}`),
};
