import type { MetodoPago } from './api';

/**
 * Tipos de pago canónicos de la app. Antes había tres uniones duplicadas:
 * `PaymentMethod` (5 valores), `MetodoPagoPedido`/`MetodoPagoEntrada` (3) y
 * `MetodoPago` del paquete de tipos (incluye `''` para "sin seleccionar").
 */
export type PaymentMethod = Exclude<MetodoPago, ''>;
export type MetodoPagoPedido = Extract<
  PaymentMethod,
  'efectivo' | 'tarjeta' | 'transferencia'
>;
export type MetodoPagoEntrada = MetodoPagoPedido;

export type { MetodoPago };
