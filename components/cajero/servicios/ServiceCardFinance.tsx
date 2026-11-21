import React from "react";
import { CardFinance } from "@/components/ui/CardFinance";

interface ServiceCardFinanceProps {
  metodoPago?: string;
  total: number;
  pagoEstado?: number;
  isFinalizadosTab: boolean;
  textColor: string;
  textMutedColor: string;
  successColor: string;
  dangerColor: string;
}

export const ServiceCardFinance: React.FC<ServiceCardFinanceProps> = ({
  metodoPago,
  total,
  pagoEstado,
  isFinalizadosTab,
  textColor,
  textMutedColor,
  successColor,
  dangerColor,
}) => {
  const statusBadge = isFinalizadosTab
    ? {
        text: pagoEstado === 0 ? 'PAGADO ✓' : 'POR PAGAR ⚠',
        color: pagoEstado === 0 ? successColor : dangerColor,
      }
    : undefined;

  return (
    <CardFinance
      total={total}
      pillText={metodoPago?.toUpperCase() || "EFECTIVO"}
      label={isFinalizadosTab ? "TOTAL COBRADO" : "TOTAL SERVICIO"}
      statusBadge={statusBadge}
      textColor={textColor}
      textMutedColor={textMutedColor}
    />
  );
};
