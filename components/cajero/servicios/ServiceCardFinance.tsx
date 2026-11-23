import React from "react";
import { CardFinance } from "@/components/ui/CardFinance";

interface ServiceCardFinanceProps {
  metodoPago?: string;
  total: number;
  isFinalizadosTab: boolean;
  textColor: string;
  textMutedColor: string;
}

export const ServiceCardFinance: React.FC<ServiceCardFinanceProps> = ({
  metodoPago,
  total,
  isFinalizadosTab,
  textColor,
  textMutedColor,
}) => {
  return (
    <CardFinance
      total={total}
      pillText={metodoPago?.toUpperCase() || "EFECTIVO"}
      label={isFinalizadosTab ? "TOTAL COBRADO" : "TOTAL SERVICIO"}
      textColor={textColor}
      textMutedColor={textMutedColor}
    />
  );
};
