import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { Anticipo } from '@/hooks/useAnticipos';

interface AnticipoDetailModalProps {
  visible: boolean;
  onClose: () => void;
  anticipo: Anticipo | null;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
  normalizeEstado: (estado: Anticipo['estado'] | number | string) => string;
}

export const AnticipoDetailModal: React.FC<AnticipoDetailModalProps> = ({
  visible,
  onClose,
  anticipo,
  formatDate,
  formatTime,
  normalizeEstado,
}) => {
  const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, accentBg, accentBorder, accentText, surfaceMuted } =
    useAccentColor();

  if (!anticipo) return null;

  const estado = normalizeEstado(anticipo.estado);
  const isPendiente = estado === 'pendiente';
  const isAprobada = estado === 'confirmada';
  const isPagada = estado === 'pagada';
  const isLiquidada = estado === 'liquidada';
  const isRechazada = estado === 'rechazada';

  const getStatusColors = () => {
    if (isPendiente)
      return {
        bg: accentBg,
        color: accentOnSurface,
        label: 'Pendiente',
      };
    if (isPagada)
      return {
        bg: surfaceMuted,
        color: accentOnSurface,
        label: 'Recibido',
      };
    if (isLiquidada)
      return {
        bg: surfaceMuted,
        color: accentColor,
        label: 'Liquidado',
      };
    if (isAprobada)
      return {
        bg: surfaceMuted,
        color: accentOnSurface,
        label: 'Aprobado',
      };
    if (isRechazada)
      return {
        bg: accentBg,
        color: accentColor,
        label: 'Rechazado',
      };
    return {
      bg: surfaceMuted,
      color: textSecondary,
      label: 'Sin estado',
    };
  };

  const statusColors = getStatusColors();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              Detalle de Anticipo
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar detalle de anticipo">
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {}
            <View
              style={[
                styles.infoCard,
                {
                  borderColor,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Ionicons name="pricetag" size={18} color={accentOnSurface} />
                <Text style={[styles.infoLabel, { color: textSecondary }]}>
                  Monto
                </Text>
                <Text style={[styles.infoValue, { color: accentOnSurface }]}>
                  ${(anticipo.monto || 0).toLocaleString()}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color={textSecondary} />
                <Text style={[styles.infoLabel, { color: textSecondary }]}>
                  Fecha solicitud
                </Text>
                <Text style={[styles.infoValue, { color: textPrimary }]}>
                  {formatDate(anticipo.fecha_crea)}
                </Text>
              </View>

              {anticipo.fecha_crea && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color={textSecondary} />
                    <Text style={[styles.infoLabel, { color: textSecondary }]}>
                      Hora
                    </Text>
                    <Text style={[styles.infoValue, { color: textPrimary }]}>
                      {formatTime(anticipo.fecha_crea)}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={statusColors.color}
                />
                <Text style={[styles.infoLabel, { color: textSecondary }]}>
                  Estado
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusText, { color: statusColors.color }]}>
                    {statusColors.label}
                  </Text>
                </View>
              </View>

              {anticipo.fecha_mod && (isPagada || isLiquidada) && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="cash-outline" size={18} color={accentOnSurface} />
                    <Text style={[styles.infoLabel, { color: textSecondary }]}>
                      Fecha recibido
                    </Text>
                    <Text style={[styles.infoValue, { color: textPrimary }]}>
                      {formatDate(anticipo.fecha_mod)}
                      {formatTime(anticipo.fecha_mod)
                        ? ` · ${formatTime(anticipo.fecha_mod)}`
                        : ''}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {}
            {anticipo.motivo && (
              <>
                <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>
                  MOTIVO
                </Text>
                <View
                  style={[
                    styles.noteCard,
                    {
                      borderColor,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    },
                  ]}
                >
                  <Text style={[styles.noteText, { color: textPrimary }]}>
                    {anticipo.motivo}
                  </Text>
                </View>
              </>
            )}

            {}
            {anticipo.motivo_rechazo && isRechazada && (
              <>
                <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>
                  MOTIVO DE RECHAZO
                </Text>
                <View
                  style={[
                    styles.rejectionCard,
                    {
                      borderColor: accentBorder,
                      backgroundColor: accentBg,
                    },
                  ]}
                >
                  <Ionicons name="close-circle" size={18} color={accentColor} />
                  <Text style={[styles.rejectionText, { color: accentColor }]}>
                    {anticipo.motivo_rechazo}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {}
          <Pressable style={[styles.closeAction, { backgroundColor: accentColor }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar detalle de anticipo">
            <Text style={[styles.closeActionText, { color: accentText }]}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.extrabold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  infoCard: {
    borderRadius: BorderRadius.full,
    padding: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.bold,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    letterSpacing: 1,
  },
  noteCard: {
    borderRadius: BorderRadius.full,
    padding: 14,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  rejectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: BorderRadius.full,
    padding: 14,
    borderWidth: 1,
  },
  rejectionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  closeAction: {
    height: 52,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  closeActionText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});
