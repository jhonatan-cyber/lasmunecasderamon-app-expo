import React from "react";
import type { Venta } from "./types";
import { ActionSheet, ActionSheetItem } from "@/components/ui/ActionSheet";

type VentaActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  activeVenta: Venta | null;
  onVerDetalles: () => void;
  onSolicitarAnulacion: () => void;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  dangerColor: string;
};

export function VentaActionSheet({
  visible,
  onClose,
  activeVenta,
  onVerDetalles,
  onSolicitarAnulacion,
  accentColor,
  dangerColor,
}: VentaActionSheetProps) {
  const items: ActionSheetItem[] = [
    {
      icon: "eye-outline",
      label: "Ver Detalles",
      color: accentColor,
      onPress: onVerDetalles,
    },
  ];

  if (activeVenta?.estado !== 0 && activeVenta?.estado !== 3) {
    items.push({
      icon: "trash-outline",
      label: "Solicitar Anulación",
      color: dangerColor,
      onPress: onSolicitarAnulacion,
    });
  }

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title="Opciones de Venta"
      subtitle={`Código: ${activeVenta?.codigo}`}
      items={items}
    />
  );
}
