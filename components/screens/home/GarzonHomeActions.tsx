import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { rutaExigeCajaAbierta } from "@/utils/cajaGate";
import { useAccentColor } from '@/hooks/useAccentColor';

interface GarzonHomeActionsProps {
  bloqueado: boolean;
  accentColor: string;
  onOpenPedidos: () => void;
  onOpenServicios: () => void;
  onOpenEntradas: () => void;
  onOpenResumen: () => void;
  /** Pedidos en cola o en curso en el salón. */
  pendingOrders?: number;
}

export function GarzonHomeActions({
  bloqueado,
  accentColor,
  onOpenPedidos,
  onOpenServicios,
  onOpenEntradas,
  onOpenResumen,
  pendingOrders = 0,
}: GarzonHomeActionsProps) {
    const { accentOnSurface } = useAccentColor();
    const actions: ActionGridItem[] = [
      {
        title: "PEDIDOS",
        description: "Gestión de comandas",
        icon: "beer",
        color: accentOnSurface,
        onPress: onOpenPedidos,
        bloqueoPorCaja: bloqueado && rutaExigeCajaAbierta("/garzon/pedidos"),
        badge: pendingOrders,
        badgeLabel: "pedidos por entregar",
      },
      {
        title: "SERVICIOS",
        description: "Atenciones activas",
        icon: "bed",
        color: "#10B981",
        onPress: onOpenServicios,
        bloqueoPorCaja: bloqueado && rutaExigeCajaAbierta("/garzon/servicios"),
      },
      {
        title: "ENTRADAS",
        description: "Cobro en la puerta",
        icon: "ticket-outline",
        color: "#F59E0B",
        onPress: onOpenEntradas,
        bloqueoPorCaja: bloqueado && rutaExigeCajaAbierta("/garzon/entradas"),
      },
      {
        title: "RESUMEN",
        description: "Total, reportes y calendario",
        icon: "stats-chart",
        color: "#3B82F6",
        onPress: onOpenResumen,
      },
    ];

    return <ActionGrid actions={actions} />;
}
