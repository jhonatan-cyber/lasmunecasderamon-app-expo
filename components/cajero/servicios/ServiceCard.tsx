import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AnimatedView } from "@/components/ui/AnimatedView";
import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius, HitSlop } from "@/constants/spacing";
import { haptic } from "@/utils/haptics";
import type { Timer } from "@/context/types";
import { formatTime, parseDateSafe } from "@/utils/timeUtils";
import { tiempoServicio } from "@/utils/servicioTiempo";
import { safeNumber } from "@/utils/format";
import {
  coloresBadgeEstado,
  estadoServicio,
  estadoVisualServicio,
} from "@/utils/servicioEstado";
import { ServiceCardHeader } from "./ServiceCardHeader";
import { ServiceCardDetails } from "./ServiceCardDetails";
import { ServiceCardTimer } from "./ServiceCardTimer";
import { ServiceCardFinance } from "./ServiceCardFinance";
import { ServiceCardActions, type ServiceCardMenuItem } from "./ServiceCardActions";

interface ServiceCardProps {
  item: Timer & {
    waiter_name?: string;
    habitacion_comision?: number;
    precio_habitacion?: number;
    precio_servicio?: number;
    iva?: number;
    pago_estado?: number;
    created_at?: string;
    estado?: number;
  };
  activeTab: string;
  serverOffset: number;
  onFinalizar?: (t: Timer) => void;
  onEditar?: (t: Timer) => void;
  onAgregarVenta?: (t: Timer) => void;
  onCambiarAnfitrionas?: (t: Timer) => void;
  onPress?: (t: any) => void;
  readOnly?: boolean;
  sinAccionesBarman?: boolean;
  theme: any;
}

const ServiceCardContent = ({
  item,
  activeTab,
  serverOffset,
  onFinalizar,
  onEditar,
  onAgregarVenta,
  onCambiarAnfitrionas,
  onPress,
  readOnly,
  sinAccionesBarman,
  theme,
  now,
}: ServiceCardProps & { now: number }) => {
    // Collapsible state - only for active services
    const [collapsed, setCollapsed] = useState(false);
    const isCollapsible = activeTab === "activos";

    // `now` forces re-render every second; tiempoServicio uses it for real-time calculation.
    const tiempo = tiempoServicio(item, serverOffset, now);
    const visual = estadoVisualServicio(item.estado, {
      excedido: tiempo.estaExcedido,
      critico: tiempo.estaCritico,
    });
    const badge = coloresBadgeEstado(visual, Boolean(theme.isDark));
    const estadoInfo = estadoServicio(item.estado);
    const total = safeNumber(item.total);

    let statusText = activeTab === "finalizados" ? "FINALIZADO" : "EN PROCESO";
    switch (visual) {
      case "excedido":
        statusText = "EXCEDIDO";
        break;
      case "critico":
        statusText = "POR VENCER";
        break;
      case "pausado":
        statusText = "PAUSADO";
        break;
      case "anulado":
        statusText = estadoInfo.label.toUpperCase();
        break;
      case "finalizado":
        statusText = "FINALIZADO";
        break;
    }

    const acentoReloj =
      visual === "excedido" || visual === "anulado"
        ? theme.danger
        : visual === "critico"
          ? theme.warning
          : visual === "pausado"
            ? theme.textMuted
            : theme.accent;

    const fondoReloj =
      visual === "excedido" || visual === "anulado"
        ? `${theme.danger}14`
        : visual === "critico"
          ? `${theme.warning}14`
          : visual === "pausado"
            ? theme.isDark
              ? "rgba(156,163,175,0.14)"
              : "rgba(156,163,175,0.12)"
            : theme.bg;

    const etiquetaReloj =
      visual === "pausado" ? "PAUSADO" : tiempo.estaExcedido ? "TIEMPO EXCEDIDO" : "TIEMPO RESTANTE";
    const valorReloj =
      visual === "pausado" || !tiempo.estaExcedido
        ? formatTime(tiempo.restante)
        : `+${formatTime(tiempo.excedidoSegundos)}`;

    const bordeColor =
      visual === "excedido" || visual === "anulado"
        ? theme.danger
        : visual === "critico" || visual === "pausado"
          ? theme.warning
          : theme.border;

    const formatDateTime = (dateStr?: string) => {
      if (!dateStr) return "";
      const date = parseDateSafe(dateStr);
      return date
        .toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .replace(/,/g, "");
    };

    const menuItems = useMemo<ServiceCardMenuItem[]>(() => {
      const items: ServiceCardMenuItem[] = [];
      // Mismo alcance que el panel anterior: solo servicios en curso o pausados.
      const puedeGestionar =
        item.tipoTransaccion === "servicio" && [2, 3].includes(Number(item.estado));
      if (puedeGestionar && onAgregarVenta) {
        items.push({
          key: "venta",
          label: "Agregar venta",
          icon: "cart-outline",
          onPress: () => onAgregarVenta(item),
        });
      }
      if (puedeGestionar && onCambiarAnfitrionas) {
        items.push({
          key: "anfitrionas",
          label: "Cambiar o liberar anfitrionas",
          icon: "people-outline",
          onPress: () => onCambiarAnfitrionas(item),
        });
      }
      if (
        !item.es_temporal &&
        !item.servicio_original_id &&
        Number(item.habitacion_comision || 0) > 0 &&
        onEditar
      ) {
        items.push({
          key: "adicional",
          label: "Servicio adicional",
          icon: "create-outline",
          onPress: () => onEditar(item),
        });
      }
      return items;
    }, [item, onAgregarVenta, onCambiarAnfitrionas, onEditar]);

    // Glow neón en modo oscuro con el color del estado visual
    const cardNeonGlow = theme.isDark ? {
      shadowColor: bordeColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    } : {};

    const accessibilityLabel = `Servicio en ${item.roomName}, estado: ${statusText}`;

    // Toggle collapse/expand when pressing the header area
    const handleHeaderPress = () => {
      haptic.tap();
      if (isCollapsible) {
        setCollapsed(prev => !prev);
      } else {
        onPress && onPress(item);
      }
    };

    return (
      <AnimatedView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 500 }}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: bordeColor,
              ...cardNeonGlow,
            },
          ]}
        >
          {/* Header - pressable to toggle collapse */}
          <Pressable
            onPress={handleHeaderPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={isCollapsible ? "Toque para expandir o contraer" : "Toque para ver detalles del servicio"}
            hitSlop={HitSlop.md}
            style={({ pressed }) => [
              styles.headerContainer,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.headerContent}>
              <ServiceCardHeader
                roomName={item.roomName}
                servicioCode={item.servicioCode}
                createdAt={item.created_at}
                statusColor={badge.foreground}
                statusText={statusText}
                statusBgColor={badge.background}
                statusTextColor={badge.foreground}
                accentColor={theme.accent}
                textColor={theme.text}
                textMutedColor={theme.textMuted}
                formatDateTime={formatDateTime}
              />
              {isCollapsible && (
                <Ionicons
                  name={collapsed ? "chevron-forward" : "chevron-down"}
                  size={20}
                  color={theme.textMuted}
                />
              )}
            </View>
          </Pressable>

          {/* Timer - always visible in collapsed and expanded state for active tab */}
          <ServiceCardTimer
            visible={activeTab === "activos" && visual !== "anulado"}
            etiqueta={etiquetaReloj}
            valor={valorReloj}
            totalMinutos={safeNumber(item.duration)}
            progreso={tiempo.progreso}
            icono={visual === "pausado" ? "pause" : visual === "excedido" ? "alert-circle" : "time"}
            acento={acentoReloj}
            fondo={fondoReloj}
            barraFondo={theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)"}
            textMutedColor={theme.textMuted}
            accessibilityLabel={`${etiquetaReloj.toLowerCase()} ${valorReloj} de ${safeNumber(item.duration)} minutos`}
          />

          {/* Expanded content - hidden when collapsed */}
          {!collapsed && (
            <>
              <ServiceCardDetails
                anfitrionas={item.anfitrionas}
                clienteNombre={item.clienteNombre}
                waiterName={item.waiter_name}
                textColor={theme.text}
                textMutedColor={theme.textMuted}
              />

              <ServiceCardFinance
                metodoPago={item.metodo_pago}
                total={total}
                isFinalizadosTab={activeTab === "finalizados"}
                textColor={theme.text}
                textMutedColor={theme.textMuted}
              />

              {!readOnly && !sinAccionesBarman && activeTab === "activos" && (
                <ServiceCardActions
                  accentColor={theme.accent}
                  accentTextColor={theme.accentText || "#FFF"}
                  cardBg={theme.card}
                  textColor={theme.text}
                  textMutedColor={theme.textMuted}
                  borderColor={theme.border}
                  menuItems={menuItems}
                  onFinalizar={() => onFinalizar?.(item)}
                />
              )}
            </>
          )}
        </View>
      </AnimatedView>
    );
};

// Local interval for real-time timer display in active services.
// memo() blocks context-based ticks, so each card manages its own interval.
const useNowTick = (active: boolean) => {
  const [now, setNow] = useState(Date.now);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (active) {
      intervalRef.current = setInterval(() => {
        setNow(Date.now);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active]);

  return now;
};

export const ServiceCard = memo((props: ServiceCardProps) => {
  const needsTick = props.activeTab === "activos" && props.item.estado !== 3;
  const now = useNowTick(needsTick);
  return <ServiceCardContent {...props} now={now} />;
});

ServiceCard.displayName = "ServiceCard";

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.card,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
});
