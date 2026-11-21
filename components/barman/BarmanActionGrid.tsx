import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { useOutbox } from "@/hooks/useOutbox";

interface BarmanActionGridProps {
  /** Transferencias de stock que el servidor todavía no confirmó. */
  pendingTransfers?: number;
}

export const BarmanActionGrid = ({
  pendingTransfers = 0,
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
    },
    {
      title: "SERVICIOS",
      description: "Gestión de privados",
      icon: "bed",
      color: "#10B981",
      route: "/barman/servicios",
    },
    {
      title: "COVERS",
      description: "Entregar entradas del día",
      icon: "ticket-outline",
      color: "#F59E0B",
      route: "/barman/covers",
    },
    {
      title: "COLACIONES",
      description: "Entregar el corto por turno",
      icon: "beer-outline",
      color: "#EAB308",
      route: "/barman/colaciones",
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
