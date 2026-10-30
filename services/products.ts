import { apiClientSafe } from '@/api/client-safe';

export const productsService = {
  getByCategory: (categoryId: string | number) =>
    apiClientSafe(`/products?category_id=${categoryId}`),

  /** Presentaciones con stock en el bar (catálogo de venta). */
  forSale: (signal?: AbortSignal) =>
    apiClientSafe('/products?for_sale=1', { signal }),

  /**
   * Bebidas analcohólicas habilitadas para cover de cliente: las únicas que el
   * bar puede servir como acompañamiento de una cortesía.
   */
  forCover: (signal?: AbortSignal) =>
    apiClientSafe('/products/for-sale?solo_cover=true', { signal }),
};
