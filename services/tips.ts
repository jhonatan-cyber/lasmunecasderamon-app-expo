import { apiClientSafe } from '@/api/client-safe';

export const tipsService = {
  userDetail: (signal?: AbortSignal) =>
    apiClientSafe('/tips/user?tipo=detalle', { signal }),

  allDetail: (signal?: AbortSignal) =>
    apiClientSafe('/tips?tipo=detalle', { signal }),

  getById: (id: string | number, signal?: AbortSignal) =>
    apiClientSafe(`/tips/${id}`, { signal }),
};
