import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { buildAttendanceMap } from './CalendarFilter';
import { FontSize, BorderRadius } from '@/constants/spacing';

export type AttendanceDate = {
  date: string;
  ids: number[];
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type DateRangeFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
  asistencias: any[];
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  borderColor: string;
  isDark: boolean;
};

export function DateRangeFilterModal({
  visible,
  onClose,
  onApply,
  asistencias,
  accentColor,
  textPrimary,
  textSecondary,
  cardBg,
  borderColor,
  isDark,
}: DateRangeFilterModalProps) {
  const { surfaceMuted } = useAccentColor();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<[number, number]>([
    now.getFullYear(),
    now.getMonth(),
  ]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const attendanceMap = useMemo(
    () => buildAttendanceMap(asistencias),
    [asistencias],
  );

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [year, month] = selectedMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;

  const days = useMemo(() => {
    const arr: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      const dateStr = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, dateStr, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, dateStr, isCurrentMonth: true });
    }
    const remaining = 7 - (arr.length % 7);
    if (remaining < 7) {
      for (let d = 1; arr.length % 7 !== 0; d++) {
        const nm = month === 11 ? 0 : month + 1;
        const ny = month === 11 ? year + 1 : year;
        const dateStr = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        arr.push({ day: d, dateStr, isCurrentMonth: false });
      }
    }
    return arr;
  }, [year, month, startOffset, daysInMonth]);

  const goPrevMonth = useCallback(() => {
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    setSelectedMonth([y, m]);
  }, [year, month]);

  const goNextMonth = useCallback(() => {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    setSelectedMonth([y, m]);
  }, [year, month]);

  const handleDatePress = useCallback((dateStr: string) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      setDateFrom(dateStr);
      setDateTo('');
    } else if (dateStr >= dateFrom) {
      setDateTo(dateStr);
    } else {
      setDateTo(dateFrom);
      setDateFrom(dateStr);
    }
  }, [dateFrom, dateTo]);

  const handleApply = useCallback(() => {
    onApply(dateFrom, dateTo);
    onClose();
  }, [dateFrom, dateTo, onApply, onClose]);

  const handleClear = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    onApply('', '');
    onClose();
  }, [onApply, onClose]);

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const day = parts[2];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${MONTH_NAMES[monthIdx]}`;
  };

  const rangeLabel = useMemo(() => {
    if (dateFrom && dateTo) {
      return `${formatDateShort(dateFrom)} — ${formatDateShort(dateTo)}`;
    }
    if (dateFrom) {
      return formatDateShort(dateFrom);
    }
    return 'Seleccionar fechas';
  }, [dateFrom, dateTo]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: cardBg, borderColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>
                Filtrar por fechas
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {rangeLabel}
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

          {/* Month navigation */}
          <View style={styles.monthNav}>
            <Pressable
              onPress={goPrevMonth}
              style={styles.monthNavBtn}
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
            >
              <Ionicons name="chevron-back" size={18} color={textPrimary} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: textPrimary }]}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <Pressable
              onPress={goNextMonth}
              style={styles.monthNavBtn}
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
            >
              <Ionicons name="chevron-forward" size={18} color={textPrimary} />
            </Pressable>
          </View>

          {/* Day names header */}
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((d) => (
              <Text key={d} style={[styles.dayName, { color: textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {days.map(({ day, dateStr, isCurrentMonth }, idx) => {
              const hasAttendance = attendanceMap.has(dateStr);
              const isToday = dateStr === today;
              const isInRange = dateFrom && dateTo && dateStr >= dateFrom && dateStr <= dateTo;
              const isEdge = dateStr === dateFrom || dateStr === dateTo;

              return (
                <Pressable
                  key={idx}
                  onPress={() => hasAttendance && handleDatePress(dateStr)}
                  style={[
                    styles.dayCell,
                    !isCurrentMonth && styles.dayOtherMonth,
                    isToday && styles.todayCell,
                    isInRange && styles.inRangeCell,
                    isEdge && [styles.edgeCell, { backgroundColor: accentColor }],
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${day} ${hasAttendance ? 'con asistencia' : 'sin asistencia'}`}
                  accessibilityState={{ disabled: !hasAttendance }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: textPrimary },
                      !isCurrentMonth && styles.dayTextOtherMonth,
                      isToday && styles.todayText,
                      isEdge && styles.edgeText,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasAttendance && !isEdge && (
                    <View
                      style={[
                        styles.attendanceDot,
                        { backgroundColor: accentColor },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.legendText, { color: textSecondary }]}>
                Días con asistencia
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotToday]} />
              <Text style={[styles.legendText, { color: textSecondary }]}>
                Hoy
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: surfaceMuted }]}
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtro"
            >
              <Text style={[styles.actionBtnText, { color: textSecondary }]}>
                Limpiar
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: accentColor }]}
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtro"
            >
              <Text style={styles.actionBtnTextPrimary}>
                Aplicar
              </Text>
            </Pressable>
          </View>
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
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xxs,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayOtherMonth: {
    opacity: 0.3,
  },
  todayCell: {
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  inRangeCell: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  edgeCell: {
    borderRadius: 9999,
  },
  dayText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    zIndex: 1,
  },
  dayTextOtherMonth: {
    opacity: 0.5,
  },
  todayText: {
    fontWeight: '800',
  },
  edgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  attendanceDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotToday: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: FontSize.xxs,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  actionBtnTextPrimary: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
