import { apiClientSafe } from '@/api/client-safe';

export const notificationsService = {
  assistance: (data: Record<string, unknown>) =>
    apiClientSafe('/notifications/assistance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  acceptAssistance: (data: Record<string, unknown>) =>
    apiClientSafe('/notifications/assistance/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
