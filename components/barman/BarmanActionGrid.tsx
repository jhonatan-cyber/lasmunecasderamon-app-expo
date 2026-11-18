import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { useOutbox } from "@/hooks/useOutbox";

export const BarmanActionGrid = () => {
  const { pendingCount, failedCount, isOffline } = useOutbox();

  const actions: ActionGridItem[] = [
    {
      title: "BAR",
      description: "Stock y transferencias",
      icon: "beer",
      color: "#F97316",
      route: "/barman/bar",
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
      title: "RESUMEN",
      description: "Calendario de actividad",
      icon: "stats-chart",
      color: "#3B82F6",
      route: "/barman/resumen",
    },
    // Solo aparece cuando hay algo que resolver: sin conexión o trabajo que el
    // servidor todavía no confirmó.
    ...(isOffline || pendingCount > 0 || failedCount > 0
      ? [
          {
            title: "PENDIENTES",
            description: "Operaciones sin enviar",
            icon: "cloud-offline" as const,
            color: "#EF4444",
            route: "/barman/pendientes",
          },
        ]
      : []),
  ];

  return <ActionGrid actions={actions} />;
};
