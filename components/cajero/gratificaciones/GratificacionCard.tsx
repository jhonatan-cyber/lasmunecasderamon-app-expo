import { StyleSheet, Text, View } from 'react-native';
import { GratificacionItem } from '@/hooks/useGratificaciones';
import { useRenderCount } from '@/hooks/useRenderCount';

const estadoConfig: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Pagado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  1: { label: 'Por pagar', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  2: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  3: { label: 'Rechazada', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' }
};

const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

interface GratificacionCardProps {
  item: GratificacionItem;
  index: number;
  isDark: boolean;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}

export function GratificacionCard({
  item,
  index,
  isDark,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary
}: GratificacionCardProps) {
  useRenderCount('GratificacionCard', { id: item.id, estado: item.estado });
  const status = estadoConfig[item.estado] || estadoConfig[2];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor, shadowColor: isDark ? '#000' : '#111827' }
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
          <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={[styles.employeeName, { color: textPrimary }]}>{item.usuario}</Text>
      <Text style={[styles.amountText, { color: accentColor }]}>{formatCurrency(item.monto)}</Text>
      <Text style={[styles.descriptionText, { color: textSecondary }]}>
        {item.descripcion || 'Sin descripción'}
      </Text>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: textSecondary }]}>
          {new Date(item.fecha_crea).toLocaleDateString('es-BO')}
        </Text>
        <Text style={[styles.metaText, { color: textSecondary }]}>
          {item.estado_texto?.replace(/_/g, ' ') || status.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  indexBadge: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  indexText: { 
    fontSize: 12, 
    fontWeight: '800' 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 9999 
  },
  statusText: { 
    fontSize: 11, 
    fontWeight: '800' 
  },
  employeeName: { 
    fontSize: 16, 
    fontWeight: '800', 
    marginBottom: 6 
  },
  amountText: { 
    fontSize: 24, 
    fontWeight: '900', 
    marginBottom: 6 
  },
  descriptionText: { 
    fontSize: 13, 
    lineHeight: 18, 
    marginBottom: 10 
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  metaText: { 
    fontSize: 11, 
    fontWeight: '600' 
  },
});
