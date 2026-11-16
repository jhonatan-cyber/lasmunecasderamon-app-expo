import React from "react";
import { CardDetailsList, DetailRowItem } from "@/components/ui/CardDetailsList";

interface CuentaCardDetailsProps {
  clienteNombre?: string;
  productCount: number;
  creadorNombre?: string;
  textPrimary: string;
  textSecondary: string;
}

export const CuentaCardDetails: React.FC<CuentaCardDetailsProps> = ({
  clienteNombre,
  productCount,
  creadorNombre,
  textPrimary,
  textSecondary,
}) => {
  const items: DetailRowItem[] = [
    {
      icon: "person",
      label: "Cliente",
      value: clienteNombre || "Sin registrar",
    },
    {
      icon: "cube",
      label: "Productos",
      value: `${productCount} item${productCount !== 1 ? "s" : ""}`,
    },
  ];

  if (creadorNombre) {
    items.push({
      icon: "create-outline",
      label: "Registrado por",
      value: creadorNombre,
    });
  }

  return <CardDetailsList items={items} textColor={textPrimary} textMutedColor={textSecondary} />;
};
