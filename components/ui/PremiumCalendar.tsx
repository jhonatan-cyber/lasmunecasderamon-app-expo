import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";

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

export const PremiumCalendar = ({
  events,
  selectedDates,
  onDateToggle,
  currentMonth: propCurrentMonth,
  onMonthChange,
}: PremiumCalendarProps) => {
  const { accentColor, isDark, cardBg, borderColor } = useAccentColor();
  const [internalCurrentMonth, setInternalCurrentMonth] = useState(new Date());

  const currentMonth = propCurrentMonth || internalCurrentMonth;
  const setCurrentMonth = (date: Date) => {
    if (onMonthChange) {
      onMonthChange(date);
    } else {
      setInternalCurrentMonth(date);
    }
  };

  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

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
        <Text style={[styles.calMonth, { color: textPrimary }]}>
          {currentMonth.toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          })}
        </Text>
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
            style={styles.navBtn}
            accessibilityLabel="Mes anterior"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={textPrimary} />
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
            style={styles.navBtn}
            accessibilityLabel="Mes siguiente"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={20} color={textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekDays}>
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
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
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: accentColor },
              ]}
              onPress={() => handleDatePress(d.day, d.month, d.year)}
              accessibilityLabel={`Día ${d.day} de ${currentMonth.toLocaleDateString("es-ES", { month: "long" })}`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.dayText,
                  { color: d.current ? textPrimary : textSecondary },
                  isSelected && { color: "#FFF" },
                  isToday &&
                    !isSelected && { color: accentColor, fontWeight: "bold" },
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
                            ? "#FFF"
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
                        {
                          backgroundColor: isSelected ? "#FFF" : textSecondary,
                        },
                      ]}
                    />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        {Object.entries(typeColors).map(([type, color]) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: textSecondary }]}>
              {type === "hora_extra"
                ? "Hora extra"
                : type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarCard: {
    marginHorizontal: 10,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  calTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calMonth: { fontSize: 16, fontWeight: "800", textTransform: "capitalize" },
  calNav: { flexDirection: "row", gap: 15 },
  navBtn: { padding: 8 },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "700",
    width: 40,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 4,
  },
  dayText: { fontSize: 14, fontWeight: "600" },
  eventDotsRow: {
    position: "absolute",
    bottom: 6,
    flexDirection: "row",
    gap: 3,
  },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  eventDotMore: { opacity: 0.8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "600" },
});
