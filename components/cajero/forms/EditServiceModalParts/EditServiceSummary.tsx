import { Text, View } from "react-native";
import { getIvaDecimal, getIvaPercent } from "@/hooks/utils/cuentaUtils";
import type { PaymentMethod } from "@/components/cajero/forms/PaymentMethodSelect";
import { styles } from "../EditServiceModal.styles";

interface EditServiceSummaryProps {
  anfitrionasCount: number;
  precioServicio: string;
  precioHabitacionSinComision: number;
  metodoPago: PaymentMethod;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}

export function EditServiceSummary({
  anfitrionasCount,
  precioServicio,
  precioHabitacionSinComision,
  metodoPago,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}: EditServiceSummaryProps) {
  const precioPorAnfitriona = parseInt(precioServicio.replace(/\./g, "")) || 0;
  const totalServicio = precioPorAnfitriona * anfitrionasCount;
  const totalHabitacion = precioHabitacionSinComision * anfitrionasCount;
  const esTarjeta = metodoPago === "tarjeta";
  const iva = esTarjeta ? Math.floor(totalServicio * getIvaDecimal()) : 0;
  let total = totalServicio + totalHabitacion + iva;
  if (esTarjeta) {
    total = Math.ceil(total / 5000) * 5000;
  }
  const plural = anfitrionasCount > 1 ? "s" : "";

  return (
    <View
      style={[styles.summaryBox, { backgroundColor: cardBg, borderColor }]}
    >
      <Text style={[styles.summaryTitle, { color: textPrimary }]}>RESUMEN</Text>

      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Servicio ({anfitrionasCount} anfitriona{plural})
        </Text>
        <Text style={[styles.summaryValue, { color: textPrimary }]}>
          ${totalServicio.toLocaleString("es-CL")}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Habitación ({anfitrionasCount} anfitriona{plural})
        </Text>
        <Text style={[styles.summaryValue, { color: textPrimary }]}>
          ${totalHabitacion.toLocaleString("es-CL")}
        </Text>
      </View>

      {esTarjeta && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: textSecondary }]}>
            {`IVA (${getIvaPercent()}%)`}
          </Text>
          <Text style={[styles.summaryValue, { color: accentColor }]}>
            ${iva.toLocaleString("es-CL")}
          </Text>
        </View>
      )}

      <View
        style={[styles.summaryDivider, { backgroundColor: borderColor }]}
      />

      <View style={styles.summaryRow}>
        <Text style={[styles.summaryTotalLabel, { color: textPrimary }]}>
          TOTAL
        </Text>
        <Text style={[styles.summaryTotalValue, { color: accentColor }]}>
          ${total.toLocaleString("es-CL")}
        </Text>
      </View>
    </View>
  );
}
