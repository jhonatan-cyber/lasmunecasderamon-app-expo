import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useCajaAbierta } from "@/hooks/useCajaAbierta";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { BloqueoPorCaja } from "@/components/shared/BloqueoPorCaja";
import { rutaExigeCajaAbierta } from "@/utils/cajaGate";
import { GarzonActionCard } from "@/components/garzon/GarzonActionCard";

type AccionCajero = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

export const CajeroActionGrid = ({
  fullWidth = false,
}: {
  fullWidth?: boolean;
}) => {
  const { accentColor } = useAccentColor();
  const router = useRouter();
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

  // Dividir acciones en pares para el layout 2x2 como el garzón
  const rows: AccionCajero[][] = [];
  for (let i = 0; i < acciones.length; i += 2) {
    rows.push(acciones.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.actionGrid, { marginTop: rowIndex > 0 ? 12 : 15 }]}>
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
                onPress={() => router.push(action.route as Href)}
              />
            </BloqueoPorCaja>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  actionGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
});
