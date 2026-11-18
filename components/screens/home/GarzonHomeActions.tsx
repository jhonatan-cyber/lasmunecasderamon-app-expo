import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { rutaExigeCajaAbierta } from "@/utils/cajaGate";

interface GarzonHomeActionsProps {
  bloqueado: boolean;
  accentColor: string;
  onOpenPedidos: () => void;
  onOpenServicios: () => void;
  onOpenEntradas: () => void;
  onOpenResumen: () => void;
}

export function GarzonHomeActions({
  bloqueado,
  accentColor,
  onOpenPedidos,
  onOpenServicios,
  onOpenEntradas,
  onOpenResumen,
}: GarzonHomeActionsProps) {
  const actions: ActionGridItem[] = [
    {
      title: "PEDIDOS",
      description: "Gestión de comandas",
      icon: "beer",
      color: accentColor,
      onPress: onOpenPedidos,
      bloqueoPorCaja: bloqueado && rutaExigeCajaAbierta("/garzon/pedidos"),
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
