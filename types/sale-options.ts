export type SaleType = "botella" | "shot";
export interface SaleOption {
  tipo: SaleType;
  precio: number;
  comision: number;
  /**
   * Precio del shot cuando lo pide una anfitriona (solo tipo 'shot'). VacÃ­o o 0 =
   * se cobra el mismo precio que a un cliente.
   */
  precio_anfitriona?: number;
  ml_acompanamiento_cliente?: number;
  ml_acompanamiento_anfitriona?: number;
  acompanamiento?: { tipo?: "gaseosa" | "soda"; unidades: number };
  precios_anfitriona?: { precio: number; comision: number }[];
}
