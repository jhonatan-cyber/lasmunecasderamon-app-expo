import { apiClientSafe } from '@/api/client-safe';

export interface CreateClientPayload {
  name: string;
  lastName: string;
  run?: string;
  phone?: string;
}

/** @see CreateClientPayload */
export type UpdateClientPayload = CreateClientPayload;

export interface PrepagoPayload {
  cliente_id: string | number;
  monto: number;
  tipo: string;
  metodo_pago: string;
  motivo: string;
  pago_mixto?: {
    metodo_primario: string;
    monto_primario: number;
    metodo_secundario: string;
    monto_secundario: number;
  };
}

export const clientesService = {
  list: () =>
    apiClientSafe('/clients'),

  getById: (id: string | number) =>
    apiClientSafe(`/clients?id=${id}`),

  create: (data: CreateClientPayload) =>
    apiClientSafe('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string | number, data: UpdateClientPayload) =>
    apiClientSafe('/clients', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string | number) =>
    apiClientSafe(`/clients?id=${id}`, {
      method: 'DELETE',
    }),

  getHistory: (clienteId: string | number) =>
    apiClientSafe(`/clients/history?cliente_id=${clienteId}`),

  prepago: (data: PrepagoPayload) =>
    apiClientSafe('/clients/prepago', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
