import React from "react";
import { CardHeader } from "@/components/ui/CardHeader";

interface ServiceCardHeaderProps {
  roomName?: string;
  servicioCode?: string;
  createdAt?: string;
  statusColor: string;
  statusText: string;
  statusBgColor?: string;
  statusTextColor?: string;
  accentColor: string;
  textColor: string;
  textMutedColor: string;
  formatDateTime: (dateStr?: string) => string;
}

export const ServiceCardHeader: React.FC<ServiceCardHeaderProps> = ({
  roomName,
  servicioCode,
  createdAt,
  statusColor,
  statusText,
  statusBgColor,
  statusTextColor,
  accentColor,
  textColor,
  textMutedColor,
  formatDateTime,
}) => (
  <CardHeader
    icon="bed"
    title={roomName || "Servicio de barra"}
    subtitle={`Código #${servicioCode || "S/N"}`}
    date={createdAt}
    statusColor={statusColor}
    statusText={statusText}
    statusBgColor={statusBgColor}
    statusTextColor={statusTextColor}
    accentColor={accentColor}
    textColor={textColor}
    textMutedColor={textMutedColor}
    formatDateTime={formatDateTime}
  />
);
