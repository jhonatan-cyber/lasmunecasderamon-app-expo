import { apiClient } from '@/api/client';

export const ordersService = {
  list: () =>
    apiClient('/orders'),

  detail: (id: string | number) =>
    apiClient(`/orders/detail?id=${id}`),

  update: (id: string | number, payload: any) =>
    apiClient(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
