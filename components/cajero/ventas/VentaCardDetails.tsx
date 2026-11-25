import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BorderRadius } from "@/constants/spacing";
import { FontFamily } from "@/constants/fonts";
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  CardDetailsList,
  type DetailRowItem,
} from "@/components/ui/CardDetailsList";

interface VentaCardDetailsProps {
  clienteNombre?: string;
  habitacionNombre?: string;
  productCount: number;
  anfitrionasNicks?: string;
  fechaCrea: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  formatDateTime: (dateStr: string) => string;
  renderTimer?: React.ReactNode;
}

export const VentaCardDetails: React.FC<VentaCardDetailsProps> = ({
  clienteNombre,
  habitacionNombre,
  productCount,
  anfitrionasNicks,
  fechaCrea,
  accentColor,
  textPrimary,
  textSecondary,
  formatDateTime,
  renderTimer,
}) => {
  const { accentOnSurface } = useAccentColor();

  // Se entregan valores como ReactNode para conservar el diseño original
  // (sin etiqueta visible, pill de anfitrionas y fecha atenuada).
  const items: DetailRowItem[] = [
    {
      icon: "person-outline",
      label: "Cliente",
      value: (
        <Text style={[styles.detailValue, { color: textPrimary }]}>
          {clienteNombre || "Sin cliente registrado"}
        </Text>
      ),
    },
    {
      icon: "business-outline",
      label: "Habitación",
      value: (
        <Text style={[styles.detailValue, { color: textPrimary }]}>
          {habitacionNombre || "Barra / General"}
        </Text>
      ),
    },
    {
      icon: "cube-outline",
      label: "Productos",
      value: (
        <Text style={[styles.detailValue, { color: textPrimary }]}>
          {productCount} {productCount === 1 ? "producto" : "productos"}
        </Text>
      ),
    },
    {
      icon: "people-outline",
      label: "Anfitrionas",
      value: anfitrionasNicks ? (
        <View style={[styles.hostessPill, { backgroundColor: `${accentColor}15` }]}>
          <Text style={[styles.hostessText, { color: accentOnSurface }]} numberOfLines={1}>
            {anfitrionasNicks}
          </Text>
        </View>
      ) : (
        <Text style={[styles.detailValue, { color: textSecondary, fontStyle: "italic" }]}>
          Venta en barra
        </Text>
      ),
    },
    {
      icon: "time-outline",
      label: "Fecha",
      value: (
        <Text style={[styles.detailValue, { color: textSecondary, fontSize: 12 }]}>
          {formatDateTime(fechaCrea)}
        </Text>
      ),
    },
  ];

  return (
    <View>
      <CardDetailsList
        items={items}
        textColor={textPrimary}
        textMutedColor={textSecondary}
        style={styles.list}
      />
      {renderTimer}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: 6, marginBottom: 0, paddingHorizontal: 0 },
  detailValue: { fontSize: 14, fontFamily: FontFamily.medium, flexShrink: 1 },
  hostessPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  hostessText: { fontSize: 13, fontFamily: FontFamily.semibold, flexShrink: 1 },
});
