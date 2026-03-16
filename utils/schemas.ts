import { z } from 'zod';

/**
 * Esquemas de validación unificados para las respuestas de la API.
 */

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  nick: z.string(),
  role: z.string().or(z.object({ id: z.number(), name: z.string() })),
  status: z.number().optional(),
  qr_token: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export const RoomSchema = z.object({
  id_habitacion: z.number(),
  numero: z.string(),
  estado: z.number(),
  price: z.number().nullable().optional(),
  time: z.number().nullable().optional(),
});

export const TimerSchema = z.object({
  servicioId: z.number(),
  roomId: z.number(),
  roomName: z.string(),
  duration: z.number(),
  startTime: z.string().or(z.date()),
  codigo: z.string(),
  clienteNombre: z.string(),
  isPaused: z.boolean().optional(),
  anfitrionas: z.string().optional(),
});

export type UserType = z.infer<typeof UserSchema>;
export type RoomType = z.infer<typeof RoomSchema>;
export type TimerType = z.infer<typeof TimerSchema>;
