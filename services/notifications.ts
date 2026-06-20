import { apiClient } from '@/api/client';

export const notificationsService = {
  pending: () =>
    apiClient('/notifications/pending'),

  pendingCount: () =>
    apiClient('/notifications/pending-count'),

  assistance: (payload: any) =>
    apiClient('/notifications/assistance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  acceptAssistance: (payload: any) =>
    apiClient('/notifications/assistance/accept', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
