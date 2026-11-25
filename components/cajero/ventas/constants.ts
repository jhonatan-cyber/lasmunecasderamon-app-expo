import { PAYMENT_METHOD_ICONS } from '@/components/ui/StatusBadge';

export const statusColors: Record<number, string> = {
  1: "#10B981", 
  2: "#3B82F6", 
  3: "#EF4444", 
  4: "#F59E0B", 
};

export const statusLabels: Record<number, string> = {
  1: "Completado",
  2: "En proceso",
  3: "Pdte. Anulación",
  0: "Anulado",
};

/** Compatibilidad: el mapa canónico vive en `ui/StatusBadge`. */
export const payMethodIcons: Record<string, string> = {
  ...PAYMENT_METHOD_ICONS,
};
