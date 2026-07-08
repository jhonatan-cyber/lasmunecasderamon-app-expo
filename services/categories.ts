import { apiClientSafe } from '@/api/client-safe';

export const categoriesService = {
  list: () =>
    apiClientSafe('/categories'),
};
