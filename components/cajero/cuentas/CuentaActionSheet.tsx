import React from "react";

import { useCuentasScreen } from "@/hooks/useCuentasScreen";
import { ActionSheet, ActionSheetItem } from "@/components/ui/ActionSheet";

type Screen = ReturnType<typeof useCuentasScreen>;

type Props = {
  screen: Screen;
  styles: Record<string, any>;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function CuentaActionSheet({
  screen,
  accentColor,
}: Props) {
  const { actionSheetVisible, activeCuenta, timers } = screen;

  const items: ActionSheetItem[] = [
    {
      icon: "eye-outline",
      label: "Ver Detalles / Recibo",
      color: accentColor,
      onPress: () => activeCuenta && screen.handleVerDetalles(String(activeCuenta.id_cuenta)),
    },
  ];

  if (Number(activeCuenta?.estado) === 1) {
    const hasTimer = timers.find(
      (timer) => timer.tipoTransaccion === "cuenta" && String(timer.servicioId) === String(activeCuenta?.id_cuenta)
    );

    if (hasTimer) {
      items.push({
        icon: "stop-circle-outline",
        label: "Finalizar Temporizador",
        color: "#F59E0B",
        onPress: () => activeCuenta && screen.handleFinalizarTemporizador(activeCuenta),
      });
    }

    items.push({
      icon: "ban-outline",
      label: "Solicitar Anulación",
      color: "#EF4444",
      onPress: () => activeCuenta && screen.handleSolicitarAnulacion(activeCuenta),
    });

    items.push({
      icon: "cash-outline",
      label: "Cobrar Cuenta",
      color: accentColor,
      onPress: () => activeCuenta && screen.handleCobrarCuenta(activeCuenta),
    });
  }

  if (Number(activeCuenta?.estado) === 4) {
    items.push({
      icon: "cash-outline",
      label: "Cobrar saldo",
      color: accentColor,
      onPress: () => activeCuenta && screen.handleCobrarCuenta(activeCuenta),
    });
  }

  return (
    <ActionSheet
      visible={actionSheetVisible}
      onClose={() => screen.setActionSheetVisible(false)}
      title="Opciones de Cuenta"
      subtitle={`Código: ${activeCuenta?.codigo}`}
      items={items}
    />
  );
}
