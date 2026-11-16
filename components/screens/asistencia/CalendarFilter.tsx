import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type AttendanceDate = {
  /** YYYY-MM-DD */
  date: string;
  /** Set of asistencia IDs on this date */
  ids: number[];
};

/**
 * Returns a map `YYYY-MM-DD -> AttendanceDate` from the asistencias array.
 */
export function buildAttendanceMap(asistencias: any[]): Map<string, AttendanceDate> {
  const map = new Map<string, AttendanceDate>();
  for (const a of asistencias) {
    const raw = a.fecha;
    if (!raw) continue;
    // Normalize to YYYY-MM-DD
    let key = raw;
    if (raw.includes('T')) {
      key = raw.split('T')[0];
    } else if (raw.length > 10) {
      key = raw.substring(0, 10);
    }
    if (!map.has(key)) {
      map.set(key, { date: key, ids: [] });
    }
    map.get(key)!.ids.push(a.id_asistencia ?? 0);
  }
  return map;
}

type CalendarFilterProps = {
  /** Map of dates that have attendance records */
  attendanceMap: Map<string, AttendanceDate>;
  /** Currently selected month (year, month) */
  selectedMonth: [number, number];
  /** Callback when month navigation changes */
  onMonthChange: (year: number, month: number) => void;
  /** Callback when a date is pressed */
  onDatePress: (dateStr: string) => void;
  /** Theme colors */
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  borderColor: string;
  isDark: boolean;
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function CalendarFilter({
  attendanceMap,
  selectedMonth: [year, month],
  onMonthChange,
  onDatePress,
  accentColor,
  textPrimary,
  textSecondary,
  cardBg,
  borderColor,
  isDark,
}: CalendarFilterProps) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Day of week for the 1st: 0=Sun, 1=Mon ... 6=Sat → we want Mon=0
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon-based offset

  const days = useMemo(() => {
    const arr: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      const dateStr = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, dateStr, isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, dateStr, isCurrentMonth: true });
    }
    // Next month padding to fill 7 columns (min 28 days)
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
    onMonthChange(y, m);
  }, [year, month, onMonthChange]);

  const goNextMonth = useCallback(() => {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    onMonthChange(y, m);
  }, [year, month, onMonthChange]);

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
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

          return (
            <Pressable
              key={idx}
              onPress={() => hasAttendance && onDatePress(dateStr)}
              style={[
                styles.dayCell,
                !isCurrentMonth && styles.dayOtherMonth,
                isToday && styles.todayCell,
                hasAttendance && styles.hasAttendanceCell,
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
                ]}
              >
                {day}
              </Text>
              {hasAttendance && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
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
  hasAttendanceCell: {},
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
  dayTextOtherMonth: {
    opacity: 0.5,
  },
  todayText: {
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
    marginTop: 12,
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
    fontSize: 11,
    fontWeight: '600',
  },
});
