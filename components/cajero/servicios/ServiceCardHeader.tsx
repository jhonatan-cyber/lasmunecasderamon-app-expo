import React from "react";
import { CardHeader } from "@/components/ui/CardHeader";

interface ServiceCardHeaderProps {
  roomName?: string;
  servicioCode?: string;
  createdAt?: string;
  statusColor: string;
  statusText: string;
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
  accentColor,
  textColor,
  textMutedColor,
  formatDateTime,
}) => (
  <CardHeader
    icon="bed"
    title={roomName || "Servicio de barra"}
    subtitle={`Codigo : #${servicioCode || "S/N"}`}
    date={createdAt}
    statusColor={statusColor}
    statusText={statusText}
    accentColor={accentColor}
    textColor={textColor}
    textMutedColor={textMutedColor}
    formatDateTime={formatDateTime}
  />
);
