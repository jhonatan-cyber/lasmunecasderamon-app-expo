import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

type AsistenciaItem = {
  id_asistencia: number;
  fecha: string;
  hora: string;
  sueldo: number;
  aporte: number;
  estado: number;
  total?: number;
  fecha_pago?: string | null;
};

type AsistenciaDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Selected date string YYYY-MM-DD */
  selectedDate: string;
  /** All asistencias for the selected date */
  asistencias: AsistenciaItem[];
  /** Theme colors */
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  borderColor: string;
  isDark: boolean;
};

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Sin fecha';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const m = parseInt(month, 10) - 1;
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (m < 0 || m > 11) return dateStr;
    return `${d} de ${months[m]} de ${y}`;
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr?.substring(0, 5);
}

function getEstadoLabel(estado: number | string, accentOnSurface: string, surfaceMuted: string, textSecondary: string) {
  const val = typeof estado === 'number' ? estado : parseInt(estado, 10);
  if (val === 0) {
    return { label: 'Cobrado', color: accentOnSurface, bg: surfaceMuted };
  }
  if (val === 1) {
    return { label: 'Pendiente', color: accentOnSurface, bg: surfaceMuted };
  }
  return { label: 'Sin estado', color: textSecondary, bg: surfaceMuted };
}

export function AsistenciaDetailModal({
  visible,
  onClose,
  selectedDate,
  asistencias,
  accentColor,
  textPrimary,
  textSecondary,
  cardBg,
  borderColor,
  isDark,
}: AsistenciaDetailModalProps) {
  const { accentOnSurface, surfaceMuted, accentText } = useAccentColor();
  const totalSueldo = asistencias.reduce((sum, a) => sum + (a.sueldo || 0), 0);
  const totalAporte = asistencias.reduce((sum, a) => sum + (a.aporte || 0), 0);
  const totalNeto = asistencias.reduce((sum, a) => sum + (a.total || a.sueldo - a.aporte || 0), 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: cardBg, borderColor, borderRadius: BorderRadius.card }]}>
          {/* Header handle */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>
                Detalle del día
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {formatDate(selectedDate)}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: surfaceMuted }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color={textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {asistencias.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textSecondary }]}>
                  No hay asistencias este día
                </Text>
              </View>
            ) : (
              <>
                {/* Summary card */}
                <View style={[styles.summaryCard, { borderColor }]}>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                    RESUMEN DEL DÍA
                  </Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryItemLabel, { color: textSecondary }]}>
                        Sueldo
                      </Text>
                      <Text style={[styles.summaryItemValue, { color: textPrimary }]}>
                        ${totalSueldo.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryItemLabel, { color: textSecondary }]}>
                        Aporte
                      </Text>
                      <Text style={[styles.summaryItemValue, { color: accentOnSurface }]}>
                        -${totalAporte.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryItemLabel, { color: textSecondary }]}>
                        Neto
                      </Text>
                      <Text style={[styles.summaryItemValue, { color: accentOnSurface, fontFamily: FontFamily.extrabold }]}>
                        ${totalNeto.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Attendance records */}
                {asistencias.map((a, idx) => {
                  const estado = getEstadoLabel(a.estado, accentOnSurface, surfaceMuted, textSecondary);

                  return (
                    <View key={a.id_asistencia || idx} style={[styles.recordCard, { borderColor }]}>
                      <View style={styles.recordHeader}>
                        <View style={styles.recordTime}>
                          <Ionicons name="time-outline" size={16} color={textSecondary} />
                          <Text style={[styles.recordTimeText, { color: textPrimary }]}>
                            {formatTime(a.hora)}
                          </Text>
                        </View>
                        <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
                          <Text style={[styles.estadoText, { color: estado.color }]}>
                            {estado.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.recordAmounts}>
                        <View style={styles.recordAmountItem}>
                          <Text style={[styles.recordAmountLabel, { color: textSecondary }]}>
                            Sueldo
                          </Text>
                          <Text style={[styles.recordAmountValue, { color: textPrimary }]}>
                            ${(a.sueldo || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.recordAmountItem}>
                          <Text style={[styles.recordAmountLabel, { color: textSecondary }]}>
                            Aporte
                          </Text>
                          <Text style={[styles.recordAmountValue, { color: accentOnSurface }]}>
                            -${(a.aporte || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.recordAmountItem}>
                          <Text style={[styles.recordAmountLabel, { color: textSecondary }]}>
                            Total
                          </Text>
                          <Text style={[styles.recordAmountValue, { color: accentOnSurface, fontFamily: FontFamily.extrabold }]}>
                            ${(a.total || a.sueldo - a.aporte || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {a.fecha_pago && (
                        <View style={styles.paymentRow}>
                          <Ionicons name="checkmark-circle" size={14} color={accentOnSurface} />
                          <Text style={[styles.paymentText, { color: textSecondary }]}>
                            Cobrado: {formatDate(a.fecha_pago)}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* Close button */}
          <Pressable
            style={[styles.closeAction, { backgroundColor: accentColor }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle"
          >
            <Text style={[styles.closeActionText, { color: accentText }]}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
  },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.extrabold,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: FontSize.sm,
    marginTop: 12,
  },
  summaryCard: {
    borderRadius: BorderRadius.card,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
  },
  recordCard: {
    borderRadius: BorderRadius.card,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordTimeText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  estadoText: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.semibold,
  },
  recordAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordAmountItem: {
    alignItems: 'center',
    flex: 1,
  },
  recordAmountLabel: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.semibold,
    marginBottom: 2,
  },
  recordAmountValue: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  paymentText: {
    fontSize: FontSize.xs,
  },
  closeAction: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  closeActionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
});
