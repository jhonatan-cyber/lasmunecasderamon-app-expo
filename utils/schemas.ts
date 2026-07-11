import { object, string, number, boolean, date } from 'zod/v4';
import type { z } from 'zod/v4';

export const UserSchema = object({
  id: number(),
  name: string(),
  nick: string(),
  role: string().or(object({ id: number(), name: string() })),
  status: number().optional(),
  qr_token: string().nullable().optional(),
  email: string().email().nullable().optional(),
});

export const RoomSchema = object({
  id_habitacion: number(),
  numero: string(),
  estado: number(),
  price: number().nullable().optional(),
  time: number().nullable().optional(),
});

export const TimerSchema = object({
  servicioId: number(),
  roomId: number(),
  roomName: string(),
  duration: number(),
  startTime: string().or(date()),
  codigo: string(),
  clienteNombre: string(),
  isPaused: boolean().optional(),
  anfitrionas: string().optional(),
});

export type UserType = z.infer<typeof UserSchema>;
export type RoomType = z.infer<typeof RoomSchema>;
export type TimerType = z.infer<typeof TimerSchema>;
