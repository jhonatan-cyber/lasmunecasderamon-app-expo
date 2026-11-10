import { useRouter, type Href } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Spacing } from "@/constants";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useCajaAbierta } from "@/hooks/useCajaAbierta";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { BloqueoPorCaja } from "@/components/shared/BloqueoPorCaja";
import { rutaExigeCajaAbierta } from "@/utils/cajaGate";
import { GarzonActionCard } from "@/components/garzon/GarzonActionCard";

export const CajeroActionGrid = ({
  fullWidth = false,
}: {
  fullWidth?: boolean;
}) => {
  const { accentColor } = useAccentColor();
  const router = useRouter();
  const { bloqueado } = useCajaAbierta();
  const esAdmin = useIsAdmin();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cols = isTablet ? 3 : 2;
  const spacing = isTablet ? 24 : 16;
  const configuracion = {
    title: "CONFIGURACIÓN",
    description: "Ventana y pantallas de asistencia",
    icon: "settings" as const,
    color: accentColor,
    route: "/cajero/configuracion-asistencia",
  };

  const actions = esAdmin
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
      configuracion,
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
        title: "CUENTAS",
        description: "Cuentas pendientes",
        icon: "receipt" as const,
        color: "#3B82F6",
        route: "/cajero/cuentas",
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
        title: "LIMPIEZA",
        description: "Surtidos de limpieza",
        icon: "brush" as const,
        color: "#06B6D4",
        route: "/cajero/limpieza",
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

  const rows = [];
  for (let i = 0; i < actions.length; i += cols) {
    rows.push(actions.slice(i, i + cols));
  }

  return (
    <View
      style={[styles.container, { paddingHorizontal: fullWidth ? 0 : spacing }]}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.actionGrid,
            { marginTop: rowIndex > 0 ? spacing / 2 : 0, gap: spacing / 2 },
          ]}
        >
          {row.map((action) => (
            <BloqueoPorCaja
              key={action.title}
              bloqueado={bloqueado && !esAdmin && rutaExigeCajaAbierta(action.route)}
              style={{ flex: 1 }}
            >
              <GarzonActionCard
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
                borderColor={accentColor}
                onPress={() => router.push(action.route as Href)}
              />
            </BloqueoPorCaja>
          ))}
          {row.length < cols &&
            Array.from({ length: cols - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1 }} />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  actionGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.sm,
  },
});
