import { apiClientSafe } from '@/api/client-safe';

export const tipsService = {
  userDetail: () =>
    apiClientSafe('/tips/user?tipo=detalle'),

  allDetail: () =>
    apiClientSafe('/tips?tipo=detalle'),

  getById: (id: string | number) =>
    apiClientSafe(`/tips/${id}`),
};
