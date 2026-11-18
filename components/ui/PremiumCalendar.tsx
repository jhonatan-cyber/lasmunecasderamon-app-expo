import { useAccentColor } from "@/hooks/useAccentColor";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback,useMemo,useState } from "react";
import { Pressable,StyleSheet,Text,View } from "react-native";

interface CalendarEvent {
  date: string;
  type?: string;
  [key: string]: any;
}

interface PremiumCalendarProps {
  events: CalendarEvent[];
  selectedDates: string[];
  onDateToggle: (dateStr: string) => void;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

export const PremiumCalendar = ({
  events,
  selectedDates,
  onDateToggle,
  currentMonth: propCurrentMonth,
  onMonthChange,
}: PremiumCalendarProps) => {
  const {
    accentColor,
    accentText,
    cardBg,
    borderColor,
    surfaceMuted,
    textPrimary,
    textSecondary,
  } = useAccentColor();
  const [internalCurrentMonth, setInternalCurrentMonth] = useState(new Date());

  const currentMonth = propCurrentMonth || internalCurrentMonth;
  const setCurrentMonth = (date: Date) => {
    if (onMonthChange) {
      onMonthChange(date);
    } else {
      setInternalCurrentMonth(date);
    }
  };



  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const typeColors: Record<string, string> = {
    asistencia: "#3B82F6",
    anticipo: "#EF4444",
    propina: "#F59E0B",
    hora_extra: "#8B5CF6",
    comision: "#10B981",
    servicio: accentColor,
    gratificacion: "#EC4899",
  };

  const getDateKey = useCallback((value: string) => {
    if (!value) return "";
    const normalized = value.replace(" ", "T");
    const [datePart] = normalized.split("T");
    if (datePart) return datePart;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, string[]>();

    events.forEach((event) => {
      const dateKey = getDateKey(event.date);
      if (!dateKey) return;

      const type = event.type || "otro";
      const currentTypes = map.get(dateKey) || [];
      if (!currentTypes.includes(type)) {
        currentTypes.push(type);
        map.set(dateKey, currentTypes);
      }
    });

    return map;
  }, [events, getDateKey]);

  const calendarDays = useMemo(() => {
    const days = [];
    const prevMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      0,
    );
    const prevMonthDays = prevMonth.getDate();
    const startDay = firstDayOfMonth(currentMonth);

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: currentMonth.getMonth() - 1,
        year: currentMonth.getFullYear(),
        current: false,
      });
    }
    const count = daysInMonth(currentMonth);
    for (let i = 1; i <= count; i++) {
      days.push({
        day: i,
        month: currentMonth.getMonth(),
        year: currentMonth.getFullYear(),
        current: true,
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear(),
        current: false,
      });
    }
    return days;
  }, [currentMonth]);

  // Solo los tipos con eventos del mes en curso: la leyenda no debe listar
  // categorías que no aparecen en pantalla.
  const presentTypes = useMemo(() => {
    const present = new Set<string>();
    calendarDays.forEach((d) => {
      if (!d.current) return;
      const dateStr = `${d.year}-${String(d.month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
      (eventsByDate.get(dateStr) || []).forEach((type) => present.add(type));
    });
    return present;
  }, [calendarDays, eventsByDate]);

  const getEventTypes = useCallback(
    (day: number, month: number, year: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return eventsByDate.get(dateStr) || [];
    },
    [eventsByDate],
  );

  const isDateSelected = useCallback(
    (day: number, month: number, year: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return selectedDates.includes(dateStr);
    },
    [selectedDates],
  );

  const handleDatePress = useCallback(
    (day: number, month: number, year: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      onDateToggle(dateStr);
    },
    [onDateToggle],
  );

  return (
    <View
      style={[styles.calendarCard, { backgroundColor: cardBg, borderColor }]}
    >
      <View style={styles.calTop}>
        <View style={styles.calMonthBlock}>
          <Ionicons name="calendar-outline" size={18} color={accentColor} />
          <Text
            style={[styles.calMonth, { color: textPrimary }]}
            numberOfLines={1}
          >
            {currentMonth.toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.calNav}>
          <Pressable
            onPress={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ),
              )
            }
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: surfaceMuted, opacity: pressed ? 0.65 : 1 },
            ]}
            accessibilityLabel="Mes anterior"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={18} color={textPrimary} />
          </Pressable>
          <Pressable
            onPress={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ),
              )
            }
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: surfaceMuted, opacity: pressed ? 0.65 : 1 },
            ]}
            accessibilityLabel="Mes siguiente"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={18} color={textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekDays}>
        {WEEKDAYS.map((d, i) => (
          <Text
            key={`${d}-${i}`}
            style={[styles.weekDayText, { color: textSecondary }]}
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((d, i) => {
          const isSelected = isDateSelected(d.day, d.month, d.year);
          const isToday =
            new Date().getDate() === d.day &&
            new Date().getMonth() === d.month &&
            new Date().getFullYear() === d.year;
          const eventTypes = getEventTypes(d.day, d.month, d.year);
          const hasEvnt = eventTypes.length > 0;
          const visibleEventTypes = eventTypes.slice(0, 3);

          return (
            <Pressable
              key={i}
              style={styles.dayCell}
              onPress={() => handleDatePress(d.day, d.month, d.year)}
              accessibilityLabel={`Día ${d.day} de ${new Date(d.year, d.month, d.day).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.dayInner,
                  isSelected && { backgroundColor: accentColor },
                  isToday &&
                    !isSelected && {
                      borderWidth: 1.5,
                      borderColor: accentColor,
                    },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: d.current ? textPrimary : textSecondary },
                    !d.current && styles.dayTextMuted,
                    isSelected && { color: accentText },
                    isToday &&
                      !isSelected && { color: accentColor, fontWeight: "800" },
                  ]}
                >
                  {d.day}
                </Text>
                {hasEvnt && (
                  <View style={styles.eventDotsRow}>
                    {visibleEventTypes.map((type, index) => (
                      <View
                        key={`${type}-${index}`}
                        style={[
                          styles.eventDot,
                          {
                            backgroundColor: isSelected
                              ? accentText
                              : typeColors[type] || accentColor,
                          },
                        ]}
                      />
                    ))}
                    {eventTypes.length > visibleEventTypes.length && (
                      <View
                        style={[
                          styles.eventDot,
                          styles.eventDotMore,
                          { backgroundColor: isSelected ? accentText : textSecondary },
                        ]}
                      />
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {presentTypes.size > 0 && (
        <View style={styles.legend}>
          {Object.entries(typeColors)
            .filter(([type]) => presentTypes.has(type))
            .map(([type, color]) => (
              <View
                key={type}
                style={[styles.legendItem, { backgroundColor: surfaceMuted }]}
              >
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendText, { color: textSecondary }]}>
                  {type === "hora_extra"
                    ? "Hora extra"
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  calendarCard: {
    alignSelf: "stretch",
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  calTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
    gap: 8,
  },
  calMonthBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  calMonth: { fontSize: 17, fontWeight: "800", textTransform: "capitalize" },
  calNav: { flexDirection: "row", alignItems: "center", gap: 6 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDayText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  dayInner: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayText: { fontSize: 14, fontWeight: "600", lineHeight: 16 },
  dayTextMuted: { opacity: 0.45 },
  eventDotsRow: {
    flexDirection: "row",
    gap: 3,
    height: 4,
    alignItems: "center",
  },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  eventDotMore: { opacity: 0.8 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "600" },
});
