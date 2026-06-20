import { apiClient } from '@/api/client';

export const productsService = {
  getByCategory: (categoryId: string | number) =>
    apiClient(`/products?category_id=${categoryId}`),
};
