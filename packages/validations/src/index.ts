import {
  object,
  boolean,
  string,
  number,
  array,
  union,
  unknown as zUnknown,
  enum as zEnum,
} from "zod/v4";
import type { z } from "zod/v4";

const paymentMethodSchema = zEnum([
  "efectivo",
  "tarjeta",
  "transferencia",
  "prepago",
  "mixto",
]);

export const loginSchema = object({
  email: string().min(1, "El usuario es obligatorio"),
  password: string().min(1, "La contrasena es obligatoria"),
});

export const resetPasswordSchema = object({
  run: string().trim().min(4, "El RUT es obligatorio"),
});

export const changePasswordSchema = object({
  password: string()
    .trim()
    .min(8, "La contrasena debe tener al menos 8 caracteres"),
  confirmPassword: string().min(1, "Confirma la contrasena"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contrasenas no coinciden",
  path: ["confirmPassword"],
});

export const AttendanceRegisterSchema = object({
  qrData: string().min(1, "Codigo QR requerido"),
});

export const OrderCreateSchema = object({
  codigo: string().min(1, "Codigo es requerido"),
  meseroId: string().min(1, "Mesero es requerido"),
  clienteId: string().nullable().optional(),
  subtotal: number().min(0),
  total: number().min(0),
  totalComision: number().optional().default(0),
  propina: number().optional().default(0),
  device_date: string().optional(),
  detalles: array(
    object({
      presentacion_id: string().nullable().optional(),
      tipo_venta: zEnum(["botella", "shot"]).optional(),
      shot_anfitriona: boolean().optional(),
      acompanamiento_botella: object({
        presentacion_id: string().min(1),
        unidades: number().int().min(1).max(1000),
      }).optional(),
      acompanamiento_corto: object({
        presentacion_id: string().min(1),
        unidades: number().int().min(1).max(1000).optional(),
        ml_por_corto: number().int().min(1).max(10000).optional(),
        nombre: string().optional(),
      })
        .refine(
          (value) =>
            (value.unidades !== undefined) !==
            (value.ml_por_corto !== undefined),
          "Selecciona unidades completas del acompa\u00f1amiento",
        )
        .optional(),
      productoId: string().min(1),
      precio: number().min(0),
      comision: number().optional().default(0),
      generaComision: number().optional().default(1),
      cantidad: number().min(1),
      subtotal: number().min(0),
      hostessId: string().nullable().optional(),
      roomId: string().nullable().optional(),
      selectedHostesses: array(string()).optional().default([]),
    })
      .passthrough()
      .refine(
        (d) =>
          d.tipo_venta !== "shot" ||
          (Boolean(d.presentacion_id) &&
            d.presentacion_id !== d.acompanamiento_corto?.presentacion_id &&
            Number.isInteger(d.cantidad) &&
            d.cantidad <= 99),
        "Cantidad o presentacion del corto invalida",
      )
      .refine(
        (d) =>
          !d.acompanamiento_botella ||
          (d.tipo_venta !== "shot" &&
            !!d.presentacion_id &&
            d.presentacion_id !== d.acompanamiento_botella.presentacion_id),
        "Acompa\u00f1amiento de botella inv\u00e1lido",
      )
      .transform((d) =>
        d.tipo_venta === "shot" && !d.shot_anfitriona
          ? {
              ...d,
              comision: 0,
              generaComision: 0,
              selectedHostesses: [],
              hostessId: null,
            }
          : d,
      )
      .refine(
        (d) =>
          d.tipo_venta !== "shot" ||
          new Set([
            ...d.selectedHostesses,
            ...(d.hostessId ? [d.hostessId] : []),
          ]).size <= d.cantidad,
        "Se permite una anfitriona por unidad de corto",
      ),
  ).min(1, "Al menos un detalle es requerido"),
  usuarios: array(
    object({
      usuarioId: string(),
    }).passthrough(),
  )
    .optional()
    .default([]),
}).passthrough();

export const ServiceCreateSchema = object({
  codigo: string().min(1, "Codigo es requerido"),
  cliente_id: string().nullable().optional(),
  clientes: array(string()).optional().default([]),
  habitacion_id: string().min(1, "Habitacion requerida"),
  producto_incluido_presentacion_id: string().min(1).nullable().optional(),
  precio_habitacion: number().min(0),
  precio_servicio: number().min(0),
  iva: number().min(0),
  sub_total: number().min(0),
  total: number().min(0),
  // Alineado con lib/business/schemas/service.ts del dashboard (min(1))
  tiempo: number().min(1, "Tiempo es requerido"),
  fecha_crea: string().min(1, "Fecha requerida"),
  metodo_pago: paymentMethodSchema,
  usuarios: array(string()).min(1, "Al menos una anfitriona es requerida"),
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
  monto: number().positive("Monto invalido"),
  motivo: string().trim().min(1, "Motivo requerido"),
}).passthrough();

/**
 * Respuestas del servidor (borde API → app). El backend puede cambiar tipos
 * (id numérico vs string) o mandar null ante un deploy a medias: validar evita
 * que un `undefined` se propague al store y rompa pantallas.
 */

/** Usuario tal como lo devuelve /auth/me (el id manda; el resto es libre). */
export const serverUserSchema = object({
  id: union([string(), number()]),
}).passthrough();

/** /configurations: solo se leen estos grupos; lo demás se ignora. */
export const configurationsSchema = object({
  comisiones: object({
    threshold_producto_caro: zUnknown().optional(),
    split_tarjeta_venta: zUnknown().optional(),
    split_tarjeta_propina: zUnknown().optional(),
  })
    .passthrough()
    .optional(),
  facturacion: object({
    impuesto_iva: zUnknown().optional(),
  })
    .passthrough()
    .optional(),
}).passthrough();

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OrderCreateType = z.infer<typeof OrderCreateSchema>;
export type ServiceCreateType = z.infer<typeof ServiceCreateSchema>;
