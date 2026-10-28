import { Text, View } from "react-native";
import { styles } from "../ServiceModal.styles";

interface ServiceReceiptSummaryProps {
  service: any;
  isDark: boolean;
  isTablet: boolean;
  accentColor: string;
  textPrimary: string;
  borderColor: string;
  subtotalServicio: number;
  subtotalHabitacion: number;
  ivaActual: number;
  totalFinal: number;
}

export function ServiceReceiptSummary({
  service,
  isDark,
  isTablet,
  accentColor,
  textPrimary,
  borderColor,
  subtotalServicio,
  subtotalHabitacion,
  ivaActual,
  totalFinal,
}: ServiceReceiptSummaryProps) {
  const labelStyle = [
    styles.productName,
    { color: textPrimary, fontSize: isTablet ? 18 : 15 },
  ];
  const valueStyle = [
    styles.productSubtotal,
    { color: textPrimary, fontSize: isTablet ? 18 : 15 },
  ];

  return (
    <View
      style={[
        styles.receiptContainer,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
          borderColor,
          marginTop: 10,
          padding: isTablet ? 24 : 16,
        },
      ]}
    >
      <View style={styles.productDetailRow}>
        <View style={styles.productInfoCol}>
          <Text style={labelStyle}>Precio Servicio</Text>
        </View>
        <Text style={valueStyle}>
          ${Math.floor(subtotalServicio).toLocaleString("de-DE")}
        </Text>
      </View>
      <View style={styles.productDetailRow}>
        <View style={styles.productInfoCol}>
          <Text style={labelStyle}>Precio Habitación</Text>
        </View>
        <Text style={valueStyle}>
          ${Math.floor(subtotalHabitacion).toLocaleString("de-DE")}
        </Text>
      </View>
      {(service.iva || 0) > 0 && (
        <View style={styles.productDetailRow}>
          <View style={styles.productInfoCol}>
            <Text style={labelStyle}>IVA / Ajuste Tarjeta</Text>
          </View>
          <Text style={valueStyle}>
            ${Math.floor(ivaActual).toLocaleString("de-DE")}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.productDetailRow,
          {
            borderTopWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.05)",
            marginTop: 8,
            paddingTop: 12,
          },
        ]}
      >
        <View style={styles.productInfoCol}>
          <Text
            style={[
              styles.productName,
              {
                color: textPrimary,
                fontWeight: "800",
                fontSize: isTablet ? 22 : 16,
              },
            ]}
          >
            TOTAL
          </Text>
        </View>
        <Text
          style={[
            styles.productSubtotal,
            {
              color: accentColor,
              fontSize: isTablet ? 26 : 18,
              fontWeight: "900",
            },
          ]}
        >
          ${Math.floor(totalFinal).toLocaleString("de-DE")}
        </Text>
      </View>
    </View>
  );
}
