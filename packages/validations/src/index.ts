import { z } from 'zod';

const paymentMethodSchema = z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago', 'mixto']);

export const loginSchema = z.object({
  email: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

export const resetPasswordSchema = z.object({
  run: z.string().trim().min(4, 'El RUN es obligatorio'),
});

export const AttendanceRegisterSchema = z.object({
  qrData: z.string().min(1, 'Codigo QR requerido'),
});

export const OrderCreateSchema = z
  .object({
    codigo: z.string().min(1, 'Codigo es requerido'),
    meseroId: z.string().min(1, 'Mesero es requerido'),
    clienteId: z.string().nullable().optional(),
    subtotal: z.number().min(0),
    total: z.number().min(0),
    totalComision: z.number().optional().default(0),
    propina: z.number().optional().default(0),
    device_date: z.string().optional(),
    detalles: z
      .array(
        z
          .object({
            productoId: z.string().min(1),
            precio: z.number().min(0),
            comision: z.number().optional().default(0),
            generaComision: z.number().optional().default(1),
            cantidad: z.number().min(1),
            subtotal: z.number().min(0),
            hostessId: z.string().nullable().optional(),
            roomId: z.string().nullable().optional(),
            selectedHostesses: z.array(z.string()).optional().default([]),
          })
          .passthrough()
      )
      .min(1, 'Al menos un detalle es requerido'),
    usuarios: z
      .array(
        z
          .object({
            usuarioId: z.string(),
          })
          .passthrough()
      )
      .optional()
      .default([]),
  })
  .passthrough();

export const ServiceCreateSchema = z
  .object({
    codigo: z.string().min(1, 'Codigo es requerido'),
    cliente_id: z.string().nullable().optional(),
    clientes: z.array(z.string()).optional().default([]),
    habitacion_id: z.string().min(1, 'Habitacion requerida'),
    precio_habitacion: z.number().min(0),
    precio_servicio: z.number().min(0),
    iva: z.number().min(0),
    sub_total: z.number().min(0),
    total: z.number().min(0),
    tiempo: z.number().min(0),
    fecha_crea: z.string().min(1, 'Fecha requerida'),
    metodo_pago: paymentMethodSchema,
    usuarios: z.array(z.string()).optional().default([]),
    pagos_mixtos: z
      .array(
        z.object({
          metodo: paymentMethodSchema,
          monto: z.number().min(0),
          display: z.string(),
        })
      )
      .optional(),
    metodo_pago_adicional: z.string().optional(),
    monto_prepago: z.number().min(0).optional(),
  })
  .passthrough();

export const AnticipoRequestSchema = z
  .object({
    monto: z.number().positive('Monto invalido'),
    motivo: z.string().trim().min(1, 'Motivo requerido'),
  })
  .passthrough();

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OrderCreateType = z.infer<typeof OrderCreateSchema>;
export type ServiceCreateType = z.infer<typeof ServiceCreateSchema>;
