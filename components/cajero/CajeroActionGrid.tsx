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

export const CajeroActionGrid = () => {
  const { accentColor } = useAccentColor();
  const { bloqueado } = useCajaAbierta();
  const esAdmin = useIsAdmin();

  const acciones: AccionCajero[] = esAdmin
    ? [
        {
          title: "ESTADO DE CAJA",
          description: "Turno abierto y resumen",
          icon: "cash" as const,
          color: "#14B8A6",
          route: "/cajero/caja",
        },
        {
          title: "ASISTENCIA LOCAL",
          description: "Quiénes marcaron hoy",
          icon: "calendar" as const,
          color: "#0EA5E9",
          route: "/cajero/asistencia-local",
        },
        {
          title: "VENTAS",
          description: "Listado de ventas",
          icon: "cart" as const,
          color: "#22C55E",
          route: "/cajero/ventas",
        },
        {
          title: "SERVICIOS",
          description: "Listado de servicios",
          icon: "bed" as const,
          color: "#F97316",
          route: "/cajero/servicios",
        },
        {
          title: "COMPRAS",
          description: "Compras y proveedores",
          icon: "bag-handle" as const,
          color: "#8B5CF6",
          route: "/cajero/compras",
        },
        {
          title: "PAGOS",
          description: "Pagos a trabajadores",
          icon: "wallet" as const,
          color: "#059669",
          route: "/cajero/pagos",
        },
        {
          title: "ANTICIPOS",
          description: "Aprobar y rechazar",
          icon: "card" as const,
          color: "#EF4444",
          route: "/cajero/anticipos-admin",
        },
        {
          title: "GRATIFICACIONES",
          description: "Registrar y revisar",
          icon: "gift" as const,
          color: "#EC4899",
          route: "/cajero/gratificaciones",
        },
        {
          title: "HORAS EXTRAS",
          description: "Registrar horas",
          icon: "time" as const,
          color: "#F59E0B",
          route: "/cajero/horas-extras",
        },
        {
          title: "CONFIGURACIÓN",
          description: "Ventana y pantallas de asistencia",
          icon: "settings" as const,
          color: accentColor,
          route: "/cajero/configuracion-asistencia",
        },
      ]
    : [
        {
          title: "VENTAS",
          description: "Realizar nueva venta",
          icon: "cart" as const,
          color: "#22C55E",
          route: "/cajero/ventas",
        },
        {
          title: "SERVICIOS",
          description: "Gestión de privados",
          icon: "bed" as const,
          color: "#F97316",
          route: "/cajero/servicios",
        },
        {
          title: "COLACIONES",
          description: "Cortos de turno",
          icon: "beer" as const,
          color: "#F59E0B",
          route: "/cajero/colaciones",
        },
        {
          title: "CAJA",
          description: "Control de cajas",
          icon: "cash" as const,
          color: "#14B8A6",
          route: "/cajero/caja",
        },
        {
          title: "PEDIDOS",
          description: "Solicitudes pendientes",
          icon: "notifications" as const,
          color: "#EF4444",
          route: "/cajero/solicitudes",
        },
        {
          title: "CLIENTES",
          description: "Gestión de prepago",
          icon: "person" as const,
          color: "#8B5CF6",
          route: "/cajero/clientes",
        },
        {
          title: "ENTRADAS",
          description: "Cobro en la puerta",
          icon: "enter-outline" as const,
          color: "#EAB308",
          route: "/cajero/entradas",
        },
        {
          title: "COVERS",
          description: "Entregar entradas del día",
          icon: "ticket-outline" as const,
          color: "#D946EF",
          route: "/cajero/covers",
        },
        {
          title: "PERSONAL",
          description: "Personal y códigos QR",
          icon: "people" as const,
          color: "#6366F1",
          route: "/cajero/personal",
        },
        {
          title: "GRATIFICACIONES",
          description: "Solicitar y revisar gratificaciones",
          icon: "gift" as const,
          color: "#EC4899",
          route: "/cajero/gratificaciones",
        },
      ];

  const actions: ActionGridItem[] = acciones.map((action) => ({
    ...action,
    bloqueoPorCaja:
      bloqueado && !esAdmin && rutaExigeCajaAbierta(action.route),
  }));

  return <ActionGrid actions={actions} />;
};
