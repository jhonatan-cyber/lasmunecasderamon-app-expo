import React from "react";
import { CardDetailsList, DetailRowItem } from "@/components/ui/CardDetailsList";

interface ServiceCardDetailsProps {
  anfitrionas?: string;
  clienteNombre?: string;
  waiterName?: string;
  textColor: string;
  textMutedColor: string;
}

export const ServiceCardDetails: React.FC<ServiceCardDetailsProps> = ({
  anfitrionas,
  clienteNombre,
  waiterName,
  textColor,
  textMutedColor,
}) => {
  const items: DetailRowItem[] = [
    {
      icon: "people",
      label: "Anfitrionas",
      value: anfitrionas || "No asignadas",
    },
    {
      icon: "person",
      label: "Cliente",
      value: (clienteNombre && clienteNombre !== 'Sin cliente') ? clienteNombre : "Sin cliente registrado",
    },
    {
      icon: "create-outline",
      label: "Registrado por",
      value: waiterName || "Admin",
    },
  ];

  return <CardDetailsList items={items} textColor={textColor} textMutedColor={textMutedColor} />;
};
