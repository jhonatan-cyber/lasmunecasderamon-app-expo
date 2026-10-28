import type { PaymentMethod } from './PaymentMethodSelect';

export interface PagoMixto {
  metodo: PaymentMethod;
  monto: number;
  display: string;
}

export function addPagoMixto<T extends PagoMixto>(pagos: T[], pago: T): T[] {
  return [...pagos, pago];
}

export function updatePagoMixto<T extends PagoMixto>(
  pagos: T[],
  index: number,
  monto: number,
  display?: string,
): T[] {
  const updated = [...pagos];
  updated[index] = {
    ...updated[index],
    monto,
    display: display ?? (monto > 0 ? String(monto) : ''),
  };
  return updated;
}

export function removePagoMixto<T extends PagoMixto>(
  pagos: T[],
  index: number,
): T[] {
  return pagos.filter((_, i) => i !== index);
}
