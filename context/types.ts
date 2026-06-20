import { MetodoPago } from '@/types/api';

export interface Timer {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number;
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: Date;
  servicioCode: string;
  cliente_id?: string | null;
  clienteNombre: string;
  tipoTransaccion?: "servicio" | "venta" | "cuenta";
  anfitrionas?: string;
  precio_servicio?: number;
  precio_habitacion?: number;
  iva?: number;
  total?: number;
  metodo_pago?: MetodoPago;
  waiter_name?: string;
  waiter_foto?: string;
  solicitante_name?: string;
  solicitante_foto?: string;
  habitacion_comision?: number;
  anfitrionas_ids?: string[];
  anfitrionas_fotos?: string[];
  created_at?: string;
  estado?: number;
  total_usuarios?: number;
  comision_individual?: number;
  lastAnnouncedMinute?: number;
  isOverdueNotified?: boolean;
  es_temporal?: boolean;
  servicio_original_id?: string | null;
}

export interface TimerContextType {
  timers: Timer[];
  serverOffset: number;
  loading: boolean;
  refreshTimers: () => Promise<void>;
}
