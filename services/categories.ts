import { apiClientSafe } from '@/api/client-safe';

export const categoriesService = {
  list: () =>
    apiClientSafe('/categories'),

  /** Catálogo de venta: solo categorías activas con stock disponible en el bar. */
  listForSale: () =>
    apiClientSafe('/categories?for_sale=1'),
};
