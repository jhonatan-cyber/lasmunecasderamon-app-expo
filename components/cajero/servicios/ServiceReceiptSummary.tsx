import { Text, View } from 'react-native';

interface Props {
  subtotalServicio: number;
  subtotalHabitacion: number;
  ivaActual: number;
  totalFinal: number;
  isDark: boolean;
  isTablet: boolean;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  styles: Record<string, any>;
}

export function ServiceReceiptSummary({
  subtotalServicio,
  subtotalHabitacion,
  ivaActual,
  totalFinal,
  isDark,
  isTablet,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
  styles,
}: Props) {
  return (
    <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor, marginTop: 10, padding: isTablet ? 24 : 16 }]}>
      <View style={styles.productDetailRow}>
        <View style={styles.productInfoCol}>
          <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>Precio Servicio</Text>
        </View>
        <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>
          ${Math.floor(subtotalServicio).toLocaleString('de-DE')}
        </Text>
      </View>
      <View style={styles.productDetailRow}>
        <View style={styles.productInfoCol}>
          <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>Precio Habitación</Text>
        </View>
        <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>
          ${Math.floor(subtotalHabitacion).toLocaleString('de-DE')}
        </Text>
      </View>
      {ivaActual > 0 && (
        <View style={styles.productDetailRow}>
          <View style={styles.productInfoCol}>
            <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>IVA / Ajuste Tarjeta</Text>
          </View>
          <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>
            ${Math.floor(ivaActual).toLocaleString('de-DE')}
          </Text>
        </View>
      )}
      <View style={[styles.productDetailRow, { borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginTop: 8, paddingTop: 12 }]}>
        <View style={styles.productInfoCol}>
          <Text style={[styles.productName, { color: textPrimary, fontWeight: '800', fontSize: isTablet ? 22 : 16 }]}>TOTAL</Text>
        </View>
        <Text style={[styles.productSubtotal, { color: accentColor, fontSize: isTablet ? 26 : 18, fontWeight: '900' }]}>
          ${Math.floor(totalFinal).toLocaleString('de-DE')}
        </Text>
      </View>
    </View>
  );
}
