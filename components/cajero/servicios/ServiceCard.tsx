import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { AnimatedView } from '@/components/ui/AnimatedView';
import type { Timer } from "@/context/types";
import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";
import { safeNumber } from "@/hooks/useServiciosScreen";
import { useRenderCount } from "@/hooks/useRenderCount";
import { ServiceCardHeader } from "./ServiceCardHeader";
import { ServiceCardDetails } from "./ServiceCardDetails";
import { ServiceCardTimer } from "./ServiceCardTimer";
import { ServiceCardFinance } from "./ServiceCardFinance";
import { ServiceCardActions } from "./ServiceCardActions";

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
  onFinalizar: (t: Timer) => void;
  onEditar?: (t: Timer) => void;
  onPress?: (t: any) => void;
  theme: any;
}

export const ServiceCard = memo(
  ({
    item,
    activeTab,
    serverOffset,
    onFinalizar,
    onEditar,
    onPress,
    theme,
  }: ServiceCardProps) => {
    useRenderCount('ServiceCard', { itemId: item?.id, activeTab, estado: item?.estado });
    const [remaining, setRemaining] = useState(() =>
      calculateRemainingTime(item, serverOffset),
    );

    useEffect(() => {
      if (activeTab === "finalizados" || item.isPaused || item.estado === 3)
        return;

      const interval = setInterval(() => {
        setRemaining(calculateRemainingTime(item, serverOffset));
      }, 1000);

      return () => clearInterval(interval);
    }, [item, serverOffset, item.isPaused, item.estado, activeTab]);

    const formatTime = (secs: number) => {
      const absSecs = Math.max(0, Math.abs(secs));
      const m = Math.floor(absSecs / 60);
      const s = absSecs % 60;
      return `${secs < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
    };

    const isCritical = remaining < 60 && remaining > 0;
    const isOverdue = remaining <= 0;
    const total = safeNumber(item.total);

    let statusText =
      activeTab === "finalizados"
        ? "FINALIZADO"
        : isOverdue
          ? "TIEMPO AGOTADO"
          : "EN PROCESO";
    let statusColor = isOverdue ? theme.danger : theme.success;

    if (item.estado === 0) {
      statusText = "ANULADO";
      statusColor = theme.danger;
    } else if (item.estado === 3) {
      statusText = "PAUSADO";
      statusColor = theme.warning;
    } else if (item.estado === 4) {
      statusText = "SOLICITUD ANUL.";
      statusColor = theme.info;
    }

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

    return (
      <AnimatedView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 500 }}
      >
        <Pressable
          onPress={() => onPress && onPress(item)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: isOverdue ? theme.danger : theme.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <ServiceCardHeader
            roomName={item.roomName}
            servicioCode={item.servicioCode}
            createdAt={item.created_at}
            statusColor={statusColor}
            statusText={statusText}
            accentColor={theme.accent}
            textColor={theme.text}
            textMutedColor={theme.textMuted}
            formatDateTime={formatDateTime}
          />

          <ServiceCardDetails
            anfitrionas={item.anfitrionas}
            clienteNombre={item.clienteNombre}
            waiterName={item.waiter_name}
            textColor={theme.text}
            textMutedColor={theme.textMuted}
          />

          <ServiceCardTimer
            visible={activeTab === "activos" && item.estado !== 3}
            isOverdue={isOverdue}
            isCritical={isCritical}
            remaining={remaining}
            duration={item.duration}
            dangerColor={theme.danger}
            warningColor={theme.warning}
            accentColor={theme.accent}
            bgColor={theme.bg}
            textColor={theme.text}
            textMutedColor={theme.textMuted}
            formatTime={formatTime}
          />

          <ServiceCardFinance
            metodoPago={item.metodo_pago}
            total={total}
            pagoEstado={item.pago_estado}
            isFinalizadosTab={activeTab === "finalizados"}
            textColor={theme.text}
            textMutedColor={theme.textMuted}
            successColor={theme.success}
            dangerColor={theme.danger}
          />

          {activeTab === "activos" && (
            <ServiceCardActions
              showEdit={Number(item.habitacion_comision || 0) > 0}
              warningColor={theme.warning}
              dangerColor={theme.danger}
              onEditar={() => onEditar && onEditar(item)}
              onFinalizar={() => onFinalizar(item)}
            />
          )}
        </Pressable>
      </AnimatedView>
    );
  },
);

ServiceCard.displayName = "ServiceCard";

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 8,
  },
});
