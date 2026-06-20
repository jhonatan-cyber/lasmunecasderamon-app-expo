import { apiClient } from '@/api/client';

export const categoriesService = {
  list: () =>
    apiClient('/categories'),
};
