import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

interface CalendarEvent {
    date: string;
    [key: string]: any;
}

interface PremiumCalendarProps {
    events: CalendarEvent[];
    selectedDates: string[];
    onDateToggle: (dateStr: string) => void;
}

export const PremiumCalendar = ({ events, selectedDates, onDateToggle }: PremiumCalendarProps) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const calendarDays = useMemo(() => {
        const days = [];
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
        const prevMonthDays = prevMonth.getDate();
        const startDay = firstDayOfMonth(currentMonth);

        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, month: currentMonth.getMonth() - 1, year: currentMonth.getFullYear(), current: false });
        }
        const count = daysInMonth(currentMonth);
        for (let i = 1; i <= count; i++) {
            days.push({ day: i, month: currentMonth.getMonth(), year: currentMonth.getFullYear(), current: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear(), current: false });
        }
        return days;
    }, [currentMonth]);

    const hasEvent = useCallback((day: number, month: number, year: number) => {
        return events.some(e => {
            const d = new Date(e.date);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
        });
    }, [events]);

    const isDateSelected = useCallback((day: number, month: number, year: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return selectedDates.includes(dateStr);
    }, [selectedDates]);

    const handleDatePress = useCallback((day: number, month: number, year: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onDateToggle(dateStr);
    }, [onDateToggle]);

    return (
        <View style={[styles.calendarCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.calTop}>
                <Text style={[styles.calMonth, { color: textPrimary }]}>
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.calNav}>
                    <Pressable
                        onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        style={styles.navBtn}
                        accessibilityLabel="Mes anterior"
                        accessibilityRole="button"
                    >
                        <Ionicons name="chevron-back" size={20} color={textPrimary} />
                    </Pressable>
                    <Pressable
                        onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        style={styles.navBtn}
                        accessibilityLabel="Mes siguiente"
                        accessibilityRole="button"
                    >
                        <Ionicons name="chevron-forward" size={20} color={textPrimary} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.weekDays}>
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                    <Text key={`${d}-${i}`} style={[styles.weekDayText, { color: textSecondary }]}>{d}</Text>
                ))}
            </View>

            <View style={styles.daysGrid}>
                {calendarDays.map((d, i) => {
                    const isSelected = isDateSelected(d.day, d.month, d.year);
                    const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === d.year;
                    const hasEvnt = hasEvent(d.day, d.month, d.year);

                    return (
                        <Pressable
                            key={i}
                            style={[styles.dayCell, isSelected && { backgroundColor: '#E11D48' }]}
                            onPress={() => handleDatePress(d.day, d.month, d.year)}
                            accessibilityLabel={`Día ${d.day} de ${currentMonth.toLocaleDateString('es-ES', { month: 'long' })}`}
                            accessibilityRole="button"
                        >
                            <Text style={[styles.dayText, { color: d.current ? textPrimary : textSecondary }, isSelected && { color: '#FFF' }, isToday && !isSelected && { color: '#E11D48', fontWeight: 'bold' }]}>
                                {d.day}
                            </Text>
                            {hasEvnt && <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFF' : '#E11D48' }]} />}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    calendarCard: { marginHorizontal: 10, borderRadius: 24, padding: 16, borderWidth: 1, marginTop: 20, marginBottom: 20 },
    calTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calMonth: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
    calNav: { flexDirection: 'row', gap: 15 },
    navBtn: { padding: 8 },
    weekDays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    weekDayText: { fontSize: 12, fontWeight: '700', width: 40, textAlign: 'center' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
    dayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginVertical: 4 },
    dayText: { fontSize: 14, fontWeight: '600' },
    eventDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 6 },
});
