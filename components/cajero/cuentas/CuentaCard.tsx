import React from "react";
import { Pressable } from "react-native";
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useRouter } from "expo-router";
import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";
import type { CuentaDetalle } from "@/hooks/types/cuentaTypes";
import type { Timer } from "@/context/types";
import { useRenderCount } from "@/hooks/useRenderCount";
import { CuentaCardHeader } from "./CuentaCardHeader";
import { CuentaCardDetails } from "./CuentaCardDetails";
import { CuentaCardTimer } from "./CuentaCardTimer";
import { CuentaCardFinance } from "./CuentaCardFinance";
import { CuentaCardActions } from "./CuentaCardActions";

interface CuentaCardProps {
  item: CuentaDetalle;
  timers: Timer[];
  serverOffset: number;
  accentColor: string;
  isDark: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  themeColors: {
    danger: string;
    warning: string;
  };
  router: ReturnType<typeof useRouter>;
  handleCobrarCuenta: (item: CuentaDetalle) => void;
  handleFinalizarTemporizador: (item: CuentaDetalle) => void;
  handleSolicitarAnulacion: (item: CuentaDetalle) => void;
  setActionSheetVisible: (visible: boolean, item: CuentaDetalle) => void;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  prepago: "Prepago",
  mixto: "Mixto",
};

export function CuentaCard({
  item,
  timers,
  serverOffset,
  accentColor,
  isDark,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
  themeColors,
  router,
  handleCobrarCuenta,
  handleFinalizarTemporizador,
  handleSolicitarAnulacion,
  setActionSheetVisible,
}: CuentaCardProps) {
  useRenderCount('CuentaCard', { cuentaId: item.id_cuenta, estado: item.estado });
  const productCount =
    item.total_detalles ||
    (item.detalles
      ? item.detalles.reduce((acc, d) => acc + d.cantidad, 0)
      : 0);
  const statusValue = Number(item.estado);
  const activeTime = Number(item.tiempo_activo ?? item.tiempo ?? 0);
  const isPending = statusValue === 1;
  const isPartialPending = statusValue === 4;
  const hasTimer = !!(isPending && activeTime > 0 && item.habitacion_id);

  const timer = hasTimer
    ? timers.find(
        (t) =>
          t.tipoTransaccion === "cuenta" &&
          String(t.servicioId) === String(item.id_cuenta),
      )
    : null;

  const isOverdue = hasTimer && timer ? calculateRemainingTime(timer, serverOffset) <= 0 : false;
  const paymentMethodText = item.metodo_pago
    ? (paymentMethodLabels[String(item.metodo_pago).toLowerCase()] || item.metodo_pago)
    : null;

  const formatDate = (dateStr?: string) => {
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
        onPress={() => setActionSheetVisible(true, item)}
        style={({ pressed }) => [
          {
            flex: 1,
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            marginBottom: 16,
            marginHorizontal: 8,
            backgroundColor: cardBg,
            borderColor: isOverdue ? themeColors.danger : borderColor,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <CuentaCardHeader
          statusValue={statusValue}
          habitacionNombre={item.habitacion_nombre || item.habitacion_numero}
          codigo={item.codigo}
          fechaCrea={item.fecha_crea}
          accentColor={accentColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          formatDate={formatDate}
        />

        <CuentaCardDetails
          clienteNombre={item.cliente_nombre}
          productCount={productCount}
          creadorNombre={item.creador_nombre}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />

        {hasTimer && (
          <CuentaCardTimer
            timer={timer}
            serverOffset={serverOffset}
            activeTime={activeTime}
            isOverdue={isOverdue}
            accentColor={accentColor}
            dangerColor={themeColors.danger}
            textSecondary={textSecondary}
          />
        )}

        <CuentaCardFinance
          total={item.total ?? 0}
          statusValue={statusValue}
          paymentMethodText={paymentMethodText}
          isPartialPending={isPartialPending}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isDark={isDark}
        />

        <CuentaCardActions
          isPending={isPending}
          isPartialPending={isPartialPending}
          hasTimer={hasTimer}
          accentColor={accentColor}
          themeColors={themeColors}
          isDark={isDark}
          onCobrar={() => handleCobrarCuenta(item)}
          onFinalizarTemporizador={() => handleFinalizarTemporizador(item)}
          onSolicitarAnulacion={() => handleSolicitarAnulacion(item)}
          onAgregar={() =>
            router.push({
              pathname: "/(app)/cajero/agregar-cuenta",
              params: { cuenta: JSON.stringify(item) },
            })
          }
        />
      </Pressable>
    </AnimatedView>
  );
}
