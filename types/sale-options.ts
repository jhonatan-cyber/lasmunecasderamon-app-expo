export type SaleType = "botella" | "shot";
export interface SaleOption {
  tipo: SaleType;
  vender_con_anfitriona?: boolean;
  colacion_habilitada?: boolean;
  cover_habilitado?: boolean;
  en_venta?: boolean;
  corto_anfitriona_habilitado?: boolean;
  ml_colacion?: number;
  acompanamiento_colacion?: { unidades: number; ml?: number };
  precio_sin_anfitriona?: number;
  precio: number;
  comision: number;
  /**
   * Precio del shot cuando lo pide una anfitriona (solo tipo 'shot'). VacÃ­o o 0 =
   * se cobra el mismo precio que a un cliente.
   */
  precio_anfitriona?: number;
  ml_acompanamiento_cliente?: number;
  ml_acompanamiento_anfitriona?: number;
  /**
   * El corto servido a cliente incluye una unidad completa de bebida. `false` =
   * sin acompañamiento: no se pide ni se descuenta bebida analcohólica. Ausente
   * = con acompañamiento, para no alterar las configuraciones existentes.
   */
  acompanamiento_cliente?: boolean;
  acompanamiento?: { tipo?: "gaseosa" | "soda"; unidades: number };
  precios_anfitriona?: { precio: number; comision: number }[];
}
