import { apiClientSafe } from '@/api/client-safe';

export const productsService = {
  getByCategory: (categoryId: string | number) =>
    apiClientSafe(`/products?category_id=${categoryId}`),

  /** Presentaciones con stock en el bar (catálogo de venta). */
  forSale: () => apiClientSafe('/products?for_sale=1'),
};
