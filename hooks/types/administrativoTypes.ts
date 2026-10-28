export interface Event {
  type:
    | 'venta'
    | 'propina'
    | 'asistencia'
    | 'anticipo'
    | 'comision'
    | 'servicio';
  id: number;
  codigo: string;
  date: string;
  amount: number;
  estado: number;
  subType?: string;
}
