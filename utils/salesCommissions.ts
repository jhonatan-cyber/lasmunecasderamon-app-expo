export interface SalesCommissionRecord {
  tipo: string;
  estado: number;
  comision?: number | null;
  monto?: number | null;
}

export function sumSalesCommissions(records: readonly SalesCommissionRecord[]): number {
  return records
    .filter((record) => record.tipo === "venta" && Number(record.estado) !== 0)
    .reduce((total, record) => {
      const amount = Number(record.comision || record.monto || 0);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
}