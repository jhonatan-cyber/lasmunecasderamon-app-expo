import Ionicons from "@expo/vector-icons/Ionicons";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useCajaAbierta } from "@/hooks/useCajaAbierta";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { rutaExigeCajaAbierta } from "@/utils/cajaGate";
import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";

type AccionCajero = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

interface CajeroActionGridProps {
  /** Anticipos aprobados que el administrador todavía no entregó. */
  pendingAdvances?: number;
}

export const CajeroActionGrid = ({
  pendingAdvances = 0,
}: CajeroActionGridProps) => {
  const { accentColor, accentOnSurface, accentUi } = useAccentColor();
  const { bloqueado } = useCajaAbierta();
  const esAdmin = useIsAdmin();

  const acciones: AccionCajero[] = esAdmin
    ? [
        { title: "ESTADO DE CAJA", description: "Turno abierto y resumen", icon: "cash" as const, color: accentOnSurface, route: "/cajero/caja" },
        { title: "RESUMEN", description: "Calendario de actividad", icon: "stats-chart" as const, color: accentColor, route: "/cajero/resumen" },
        { title: "ASISTENCIA LOCAL", description: "Quiénes marcaron hoy", icon: "calendar" as const, color: accentUi, route: "/cajero/asistencia-local" },
        { title: "VENTAS", description: "Listado de ventas", icon: "cart" as const, color: accentOnSurface, route: "/cajero/ventas" },
        { title: "SERVICIOS", description: "Listado de servicios", icon: "bed" as const, color: accentColor, route: "/cajero/servicios" },
        { title: "COMPRAS", description: "Compras y proveedores", icon: "bag-handle" as const, color: accentUi, route: "/cajero/compras" },
        { title: "PAGOS", description: "Pagos a trabajadores", icon: "wallet" as const, color: accentOnSurface, route: "/cajero/pagos" },
        { title: "ANTICIPOS", description: "Aprobar y rechazar", icon: "card" as const, color: accentColor, route: "/cajero/anticipos-admin" },
        { title: "HORAS EXTRAS", description: "Registrar horas", icon: "time" as const, color: accentOnSurface, route: "/cajero/horas-extras" },
        { title: "CONFIGURACIÓN", description: "Ventana y pantallas de asistencia", icon: "settings" as const, color: accentOnSurface, route: "/cajero/configuracion-asistencia" },
      ]
    : [
        { title: "SERVICIOS", description: "Gestión de privados", icon: "bed" as const, color: accentColor, route: "/cajero/servicios" },
        { title: "VENTAS", description: "Realizar nueva venta", icon: "cart" as const, color: accentOnSurface, route: "/cajero/ventas" },
        { title: "CAJA", description: "Control de cajas", icon: "cash" as const, color: accentOnSurface, route: "/cajero/caja" },
        { title: "PEDIDOS", description: "Solicitudes pendientes", icon: "notifications" as const, color: accentColor, route: "/cajero/solicitudes" },
        { title: "CLIENTES", description: "Gestión de prepago", icon: "person" as const, color: accentUi, route: "/cajero/clientes" },
        { title: "RESUMEN", description: "Calendario de actividad", icon: "stats-chart" as const, color: accentColor, route: "/cajero/resumen" },
      ];

  const actions: ActionGridItem[] = acciones.map((action) => ({
    ...action,
    bloqueoPorCaja: bloqueado && !esAdmin && rutaExigeCajaAbierta(action.route),
    badge:
      action.title === "ANTICIPOS"
        ? pendingAdvances
        : undefined,
    badgeLabel:
      action.title === "ANTICIPOS"
        ? "solicitudes de anticipo por revisar"
        : undefined,
  }));

  return <ActionGrid actions={actions} bentoLayout={esAdmin} />;
};
