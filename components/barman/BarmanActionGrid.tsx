import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { useOutbox } from "@/hooks/useOutbox";

interface BarmanActionGridProps {
  /** Transferencias de stock que el servidor todavía no confirmó. */
  pendingTransfers?: number;
  /** `true` cuando el servidor confirmó que no hay caja abierta. */
  bloqueado?: boolean;
}

export const BarmanActionGrid = ({
  pendingTransfers = 0,
  bloqueado = false,
}: BarmanActionGridProps) => {
  const { pendingCount, failedCount, isOffline } = useOutbox();
  const operacionesSinEnviar = pendingCount + failedCount;

  const actions: ActionGridItem[] = [
    {
      title: "BAR",
      description: "Stock y transferencias",
      icon: "beer",
      color: "#F97316",
      route: "/barman/bar",
      badge: pendingTransfers,
      badgeLabel: "transferencias sin confirmar",
    },
    {
      title: "PEDIDOS",
      description: "Realizar pedidos",
      icon: "basket",
      color: "#8B5CF6",
      route: "/barman/pedidos",
      bloqueoPorCaja: bloqueado,
    },
    {
      title: "SERVICIOS",
      description: "Gestión de privados",
      icon: "bed",
      color: "#10B981",
      route: "/barman/servicios",
      bloqueoPorCaja: bloqueado,
    },
    {
      title: "COVERS",
      description: "Entregar entradas del día",
      icon: "ticket-outline",
      color: "#F59E0B",
      route: "/barman/covers",
      bloqueoPorCaja: bloqueado,
    },
    {
      title: "COLACIONES",
      description: "Entregar el corto por turno",
      icon: "beer-outline",
      color: "#EAB308",
      route: "/barman/colaciones",
      bloqueoPorCaja: bloqueado,
    },
    {
      title: "RESUMEN",
      description: "Calendario de actividad",
      icon: "stats-chart",
      color: "#3B82F6",
      route: "/barman/resumen",
    },
    // Solo aparece cuando hay algo que resolver: sin conexión o trabajo que el
    // servidor todavía no confirmó.
    ...(isOffline || operacionesSinEnviar > 0
      ? [
          {
            title: "PENDIENTES",
            description: "Operaciones sin enviar",
            icon: "cloud-offline" as const,
            color: "#EF4444",
            route: "/barman/pendientes",
            badge: operacionesSinEnviar,
            badgeLabel: "operaciones sin enviar",
          },
        ]
      : []),
  ];

  return <ActionGrid actions={actions} />;
};
