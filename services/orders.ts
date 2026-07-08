import { apiClientSafe } from '@/api/client-safe';

export const ordersService = {
  list: () =>
    apiClientSafe('/orders'),

  detail: (id: string | number) =>
    apiClientSafe(`/orders/detail?id=${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
