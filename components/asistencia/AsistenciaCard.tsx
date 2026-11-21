import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';

interface AsistenciaCardProps {
  item: any;
  index: number;
  activeTab: string;
  isDark: boolean;
  accentColor: string;
  cardBg: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  formatDate: (dateStr: string) => string;
  normalizeEstado: (estado: number | string | null | undefined) => string;
}

export const AsistenciaCard: React.FC<AsistenciaCardProps> = ({
  item,
  index,
  activeTab,
  isDark,
  accentColor,
  cardBg,
  surfaceMuted,
  textPrimary,
  textSecondary,
  borderColor,
  formatDate,
  normalizeEstado,
}) => {
    const { accentOnSurface } = useAccentColor();
  const estado = normalizeEstado(item.estado);
  const isPendiente = estado === 'pendiente';
  const isPagado = estado === 'pagado';
  const isAsistencia = activeTab === 'asistencias';
  const dateStr = isAsistencia ? item.fecha : item.fecha_hora;
  const timeStr = isAsistencia
    ? item.hora
    : !isAsistencia && item.fecha_hora
      ? item.fecha_hora.split(' ')[1]
      : '';

  return (
    <AnimatedView
      from={{ opacity: 0, translateY: 30 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
    >
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.indexBadge,
              { backgroundColor: surfaceMuted },
            ]}
          >
            <Text style={[styles.indexText, { color: textPrimary }]}>
              {index + 1}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isPendiente
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.2)'
                    : '#D1FAE5'
                  : isDark
                    ? 'rgba(59, 130, 246, 0.2)'
                    : '#DBEAFE',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isPendiente
                    ? isDark
                      ? '#10B981'
                      : '#065F46'
                    : isDark
                      ? '#3B82F6'
                      : '#1E40AF',
                },
              ]}
            >
              {isPendiente
                ? 'Por cobrar'
                : isPagado
                  ? 'Cobrado'
                  : 'Sin estado'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {!isAsistencia && item.descripcion ? (
            <Text
              style={{
                fontSize: 13,
                color: textSecondary,
                marginBottom: 12,
                backgroundColor: isDark ? '#222' : '#f9f9f9',
                padding: 8,
                borderRadius: 8,
                fontStyle: 'italic',
              }}
            >
              "{item.descripcion}"
            </Text>
          ) : null}
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={textSecondary}
            />
            <Text style={[styles.dateText, { color: textPrimary }]}>
              {formatDate(dateStr)}
            </Text>
            {timeStr ? (
              <>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={textSecondary}
                  style={{ marginLeft: 12 }}
                />
                <Text style={[styles.dateText, { color: textSecondary }]}>
                  {timeStr?.slice(0, 5)}
                </Text>
              </>
            ) : null}
          </View>

          {isAsistencia ? (
            <View style={styles.amountsRow}>
              <View style={styles.amountItem}>
                <Text
                  style={[styles.amountLabel, { color: textSecondary }]}
                >
                  Sueldo
                </Text>
                <Text style={[styles.amountValue, { color: textPrimary }]}>
                  ${(item.sueldo || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.amountItem}>
                <Text
                  style={[styles.amountLabel, { color: textSecondary }]}
                >
                  Aporte
                </Text>
                <Text style={[styles.amountValue, { color: '#EF4444' }]}>
                  -${(item.aporte || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.amountItem}>
                <Text
                  style={[styles.amountLabel, { color: textSecondary }]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    styles.amountValue,
                    { color: accentOnSurface, fontWeight: '800' },
                  ]}
                >
                  ${(item.total || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.amountsRow}>
              <View style={styles.amountItem}>
                <Text
                  style={[styles.amountLabel, { color: textSecondary }]}
                >
                  Monto Otorgado
                </Text>
                <Text
                  style={[
                    styles.amountValue,
                    { color: accentOnSurface, fontWeight: '800' },
                  ]}
                >
                  ${(item.monto || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {item.fecha_pago && isPagado ? (
            <View style={styles.paymentRow}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={accentOnSurface}
              />
              <Text style={[styles.paymentText, { color: textSecondary }]}>
                Pagado: {formatDate(item.fecha_pago)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: { fontSize: 14, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: { fontSize: 14, marginLeft: 6 },
  amountsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  amountItem: { flex: 1 },
  amountLabel: { fontSize: 11, fontWeight: '600' },
  amountValue: { fontSize: 16, fontWeight: '700' },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  paymentText: { fontSize: 12, fontWeight: '500' },
});
