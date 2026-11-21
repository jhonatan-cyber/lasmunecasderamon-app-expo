import { Text, View } from "react-native";
import { styles } from "../AnticiposScreen.styles";
import { formatCurrency, type VistaAnticipos } from "./anticiposUtils";
import { useAccentColor } from '@/hooks/useAccentColor';

interface AnticiposSummaryCardProps {
  viewMode: VistaAnticipos;
  totalPendiente: number;
  totalEnCaja: number;
  totalPagado: number;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textSecondary: string;
}

export function AnticiposSummaryCard({
  viewMode,
  totalPendiente,
  totalEnCaja,
  totalPagado,
  accentColor,
  cardBg,
  borderColor,
  textSecondary,
}: AnticiposSummaryCardProps) {
  const { isDark } = useAccentColor();
  const summaryNeonColor = viewMode === "solicitudes" ? "#F59E0B" : accentColor;
  const cardNeonGlow = isDark ? {
    shadowColor: summaryNeonColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderColor: summaryNeonColor,
    borderWidth: 1.5,
  } : {};

  return (
    <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }, cardNeonGlow]}>
      <Text style={[styles.summaryLabel, { color: textSecondary }]}>
        {viewMode === "solicitudes"
          ? "SITUACIÓN DE SOLICITUDES"
          : "ANTICIPOS RECIBIDOS"}
      </Text>
      <Text
        style={[
          styles.summaryAmount,
          { color: viewMode === "solicitudes" ? "#F59E0B" : accentColor },
        ]}
      >
        $
        {viewMode === "solicitudes"
          ? formatCurrency(totalPendiente)
          : formatCurrency(totalPagado)}
      </Text>
      <View style={styles.summaryDetails}>
        <Text style={[styles.summaryDetail, { color: textSecondary }]}>
          {viewMode === "solicitudes"
            ? `Solicitudes: $${formatCurrency(totalPendiente)} | Aprobadas: $${formatCurrency(totalEnCaja)}`
            : `Total retirado históricamente: $${formatCurrency(totalPagado)}`}
        </Text>
      </View>
    </View>
  );
}
