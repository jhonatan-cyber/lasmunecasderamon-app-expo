import React from "react";
import { CardHeader } from "@/components/ui/CardHeader";

const statusColors: Record<number, string> = {
  0: "#10B981",
  1: "#fa2828ff",
  2: "#F59E0B",
  3: "#6B7280",
  4: "#FB923C",
};

const statusLabels: Record<number, string> = {
  0: "Cobrado",
  1: "Pendiente",
  2: "Solicitud Anul.",
  3: "Anulado",
  4: "Anul. Parcial",
};

interface CuentaCardHeaderProps {
  statusValue: number;
  habitacionNombre?: string;
  codigo: string;
  fechaCrea?: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  formatDate: (date?: string) => string;
}

export const CuentaCardHeader: React.FC<CuentaCardHeaderProps> = ({
  statusValue,
  habitacionNombre,
  codigo,
  fechaCrea,
  accentColor,
  textPrimary,
  textSecondary,
  formatDate,
}) => {
  const statusColor = statusColors[statusValue] || "#6B7280";
  const statusText = statusLabels[statusValue] || "Desconocido";

  return (
    <CardHeader
      icon="receipt"
      title={habitacionNombre || "Barra / General"}
      subtitle={`Codigo : #${codigo}`}
      date={fechaCrea}
      statusColor={statusColor}
      statusText={statusText}
      accentColor={accentColor}
      textColor={textPrimary}
      textMutedColor={textSecondary}
      formatDateTime={formatDate}
    />
  );
};
