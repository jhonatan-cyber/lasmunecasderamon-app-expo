import {
  object,
  string,
  number,
  array,
  enum as zEnum,
} from 'zod/v4';
import type { z } from 'zod/v4';

const paymentMethodSchema = zEnum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto']);

export const loginSchema = object({
  email: string().min(1, 'El usuario es obligatorio'),
  password: string().min(1, 'La contrasena es obligatoria'),
});

export const resetPasswordSchema = object({
  run: string().trim().min(4, 'El RUN es obligatorio'),
});

export const AttendanceRegisterSchema = object({
  qrData: string().min(1, 'Codigo QR requerido'),
});

export const OrderCreateSchema = object({
  codigo: string().min(1, 'Codigo es requerido'),
  meseroId: string().min(1, 'Mesero es requerido'),
  clienteId: string().nullable().optional(),
  subtotal: number().min(0),
  total: number().min(0),
  totalComision: number().optional().default(0),
  propina: number().optional().default(0),
  device_date: string().optional(),
  detalles: array(
    object({
      productoId: string().min(1),
      precio: number().min(0),
      comision: number().optional().default(0),
      generaComision: number().optional().default(1),
      cantidad: number().min(1),
      subtotal: number().min(0),
      hostessId: string().nullable().optional(),
      roomId: string().nullable().optional(),
      selectedHostesses: array(string()).optional().default([]),
    }).passthrough(),
  ).min(1, 'Al menos un detalle es requerido'),
  usuarios: array(
    object({
      usuarioId: string(),
    }).passthrough(),
  ).optional().default([]),
}).passthrough();

export const ServiceCreateSchema = object({
  codigo: string().min(1, 'Codigo es requerido'),
  cliente_id: string().nullable().optional(),
  clientes: array(string()).optional().default([]),
  habitacion_id: string().min(1, 'Habitacion requerida'),
  precio_habitacion: number().min(0),
  precio_servicio: number().min(0),
  iva: number().min(0),
  sub_total: number().min(0),
  total: number().min(0),
  tiempo: number().min(0),
  fecha_crea: string().min(1, 'Fecha requerida'),
  metodo_pago: paymentMethodSchema,
  usuarios: array(string()).optional().default([]),
  pagos_mixtos: array(
    object({
      metodo: paymentMethodSchema,
      monto: number().min(0),
      display: string(),
    }),
  ).optional(),
  metodo_pago_adicional: string().optional(),
  monto_prepago: number().min(0).optional(),
}).passthrough();

export const AnticipoRequestSchema = object({
  monto: number().positive('Monto invalido'),
  motivo: string().trim().min(1, 'Motivo requerido'),
}).passthrough();

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OrderCreateType = z.infer<typeof OrderCreateSchema>;
export type ServiceCreateType = z.infer<typeof ServiceCreateSchema>;
