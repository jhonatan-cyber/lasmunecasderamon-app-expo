import { apiClientSafe } from '@/api/client-safe';

export const productsService = {
  getByCategory: (categoryId: string | number) =>
    apiClientSafe(`/products?category_id=${categoryId}`),
};
