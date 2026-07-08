/** Raw timer data from the API */
export interface TimerRawData {
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number;
  remainingTime?: number;
  isPaused?: number | boolean;
  estado?: number;
  startTime: string;
  codigo?: string;
  cliente_id?: string;
  clienteNombre?: string;
  tipoTransaccion?: "servicio" | "venta" | "cuenta";
  anfitrionas?: string;
  precio_servicio?: number;
  precio_habitacion?: number;
  iva?: number;
  total?: number;
  metodo_pago?: string;
  waiter_name?: string;
  waiter_foto?: string;
  solicitante_name?: string;
  solicitante_foto?: string;
  habitacion_comision?: number;
  anfitrionas_ids?: string | string[];
  anfitrionas_fotos?: string[];
  created_at?: string;
  total_usuarios?: number;
  comision_individual?: number;
  servicioOriginalId?: string | number;
  es_temporal?: number | boolean;
  newStartTime?: string;
  habitacion_numero?: string;
  habitacion_id?: string;
}

/** Generic SSE event payload structure — data is flexible to accommodate different event types */
export interface SSEPayload {
  type: string;
  data?: Record<string, unknown>;
}

