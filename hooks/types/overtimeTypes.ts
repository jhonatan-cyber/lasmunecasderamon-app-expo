export interface OvertimeRecord {
  id_hora_extra: number;
  usuario_id: number;
  usuario: string;
  usuario_foto?: string | null;
  fecha_crea: string;
  fecha_mod: string | null;
  hora: number;
  monto: number;
  total: number;
  estado: number;
}
