import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { apiClient } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';

import logger from '@/utils/logger';
const { width } = Dimensions.get('window');
const DAY_SIZE = Math.floor((width - 64) / 7);

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const STATUS_OPEN = 1;

function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatCurrency(value: number): string {
    return '$' + Math.round(value).toLocaleString('es-CL');
}

function formatSimpleDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface DayData {
    asistencias: boolean;
    anticipos: boolean;
    propinas: boolean;
    horasExtras: boolean;
}

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    data: DayData;
    isToday: boolean;
}

interface ModalDataType {
    title: string;
    key: 'asistencias' | 'anticipos' | 'propinas' | 'horasExtras';
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

const DATA_TYPES: ModalDataType[] = [
    { title: 'Asistencias', key: 'asistencias', icon: 'calendar', color: '#10B981' },
    { title: 'Anticipos', key: 'anticipos', icon: 'swap-horizontal', color: '#EF4444' },
    { title: 'Propinas', key: 'propinas', icon: 'cash', color: '#F59E0B' },
    { title: 'Horas Extras', key: 'horasExtras', icon: 'time', color: '#8B5CF6' },
];

function getStatusBadge(estado: number) {
    if (estado === 0) return { label: 'PAGADO', color: '#10B981', bg: '#10B98120' };
    if (estado === 1) return { label: 'POR PAGAR', color: '#EF4444', bg: '#EF444420' };
    return { label: 'Desconocido', color: '#6B7280', bg: '#6B728020' };
}

export default function CalendarioScreen() {
    const router = useRouter();
    const { accentColor, accentBg, isDark } = useAccentColor();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [days, setDays] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDataType, setSelectedDataType] = useState<ModalDataType['key']>('asistencias');
    const [selectedDateData, setSelectedDateData] = useState<any[]>([]);
    const [isLoadingSelected, setIsLoadingSelected] = useState(false);
    const [totalCobrar, setTotalCobrar] = useState(0);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#222222' : '#E5E7EB';

    // Build all days data from API
    const fetchCalendarData = useCallback(async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

            const [asistRes, anticRes, propRes, heRes] = await Promise.allSettled([
                apiClient(`/attendance/by-dates?startDate=${startDate}&endDate=${endDate}`),
                apiClient(`/anticipos/by-dates?startDate=${startDate}&endDate=${endDate}`),
                apiClient(`/tips/user?startDate=${startDate}&endDate=${endDate}`),
                apiClient(`/overtime/by-dates?startDate=${startDate}&endDate=${endDate}`),
            ]);

            const asistencias: any[] = (asistRes.status === 'fulfilled' && asistRes.value?.success) ? asistRes.value.data || [] : [];
            const anticipos: any[] = (anticRes.status === 'fulfilled' && anticRes.value?.success) ? anticRes.value.data || [] : [];
            const propinas: any[] = (propRes.status === 'fulfilled' && propRes.value?.success) ? propRes.value.data || [] : [];
            const horasExtras: any[] = (heRes.status === 'fulfilled' && heRes.value?.success) ? heRes.value.data || [] : [];

            // Build lookup maps
            const asistDates = new Set(asistencias.map((a: any) => toDateKey(new Date(a.fecha))));
            const anticDates = new Set(anticipos.map((a: any) => toDateKey(new Date(a.fecha_crea))));
            const propDates = new Set(propinas.map((p: any) => toDateKey(new Date(p.fecha_crea))));
            const heDates = new Set(horasExtras.map((h: any) => toDateKey(new Date(h.fecha_crea))));

            // Generate calendar days
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const firstDayOfWeek = firstDay.getDay();
            const today = new Date();
            const todayKey = toDateKey(today);

            const calendarDays: CalendarDay[] = [];

            // Previous month fill
            const prevMonthLast = new Date(year, month, 0);
            for (let i = firstDayOfWeek - 1; i >= 0; i--) {
                const d = new Date(year, month - 1, prevMonthLast.getDate() - i);
                const dk = toDateKey(d);
                calendarDays.push({
                    date: d,
                    isCurrentMonth: false,
                    data: {
                        asistencias: asistDates.has(dk),
                        anticipos: anticDates.has(dk),
                        propinas: propDates.has(dk),
                        horasExtras: heDates.has(dk),
                    },
                    isToday: dk === todayKey,
                });
            }

            // Current month days
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const d = new Date(year, month, day);
                const dk = toDateKey(d);
                calendarDays.push({
                    date: d,
                    isCurrentMonth: true,
                    data: {
                        asistencias: asistDates.has(dk),
                        anticipos: anticDates.has(dk),
                        propinas: propDates.has(dk),
                        horasExtras: heDates.has(dk),
                    },
                    isToday: dk === todayKey,
                });
            }

            // Next month fill to complete 6 weeks (42 days)
            const remaining = 42 - calendarDays.length;
            for (let day = 1; day <= remaining; day++) {
                const d = new Date(year, month + 1, day);
                const dk = toDateKey(d);
                calendarDays.push({
                    date: d,
                    isCurrentMonth: false,
                    data: {
                        asistencias: asistDates.has(dk),
                        anticipos: anticDates.has(dk),
                        propinas: propDates.has(dk),
                        horasExtras: heDates.has(dk),
                    },
                    isToday: dk === todayKey,
                });
            }

            setDays(calendarDays);
        } catch (err) {
            logger.captureException(err, { context: 'Calendario:fetchCalendar' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentDate, apiClient]);

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCalendarData();
    }, [fetchCalendarData]);

    // Fetch details for selected dates — fetch all 4 types in parallel once
    const fetchSelectedDateDetails = useCallback(async () => {
        if (selectedDates.length === 0) return;
        setIsLoadingSelected(true);
        try {
            // Use date range (startDate/endDate) instead of 'dates' param
            // for compatibility with all endpoints including /tips/user
            const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
            const startDate = toDateKey(sorted[0]);
            const endDate = toDateKey(sorted[sorted.length - 1]);

            // Fetch all 4 types in parallel (single call per type)
            const [asistRes, anticRes, propRes, heRes] = await Promise.allSettled([
                apiClient(`/attendance/by-dates?startDate=${startDate}&endDate=${endDate}`),
                apiClient(`/anticipos/by-dates?startDate=${startDate}&endDate=${endDate}`),
                apiClient(`/tips/user?startDate=${startDate}&endDate=${endDate}`),
                apiClient(`/overtime/by-dates?startDate=${startDate}&endDate=${endDate}`),
            ]);

            const asistencias: any[] = (asistRes.status === 'fulfilled' && asistRes.value?.success) ? asistRes.value.data || [] : [];
            const anticipos: any[] = (anticRes.status === 'fulfilled' && anticRes.value?.success) ? anticRes.value.data || [] : [];
            const propinas: any[] = (propRes.status === 'fulfilled' && propRes.value?.success) ? propRes.value.data || [] : [];
            const horasExtras: any[] = (heRes.status === 'fulfilled' && heRes.value?.success) ? heRes.value.data || [] : [];

            // Set detail data based on selected type
            switch (selectedDataType) {
                case 'asistencias':
                    setSelectedDateData(asistencias);
                    break;
                case 'anticipos':
                    setSelectedDateData(anticipos);
                    break;
                case 'propinas':
                    setSelectedDateData(propinas);
                    break;
                case 'horasExtras':
                    setSelectedDateData(horasExtras);
                    break;
            }

            // Calculate total a cobrar from the already-fetched data
            const total =
                asistencias
                    .filter((a: any) => a.estado === STATUS_OPEN)
                    .reduce((s: number, a: any) => s + (a.sueldo_final || 0), 0)
                +
                propinas
                    .filter((p: any) => p.estado === STATUS_OPEN)
                    .reduce((s: number, p: any) => s + (p.monto || 0), 0)
                +
                horasExtras
                    .filter((h: any) => h.estado === STATUS_OPEN)
                    .reduce((s: number, h: any) => s + (h.total || 0), 0)
                -
                anticipos
                    .filter((a: any) => a.estado === STATUS_OPEN)
                    .reduce((s: number, a: any) => s + (a.monto || 0), 0);

            setTotalCobrar(total);
        } catch (err) {
            logger.captureException(err, { context: 'Calendario:fetchCalendar' });
            setSelectedDateData([]);
        } finally {
            setIsLoadingSelected(false);
        }
    }, [selectedDates, selectedDataType, apiClient]);

    useEffect(() => {
        if (modalVisible) {
            fetchSelectedDateDetails();
        }
    }, [modalVisible, selectedDataType]);

    const navigateMonth = (direction: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleDayPress = (day: CalendarDay) => {
        setSelectedDates([day.date]);
        setSelectedDataType('asistencias');
        setSelectedDateData([]);
        setTotalCobrar(0);
        setModalVisible(true);
    };

    const formatSelectedDates = () => {
        if (selectedDates.length === 0) return '';
        const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        if (sorted.length === 1) {
            const d = sorted[0];
            return `${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        }
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        return `${first.getDate()} de ${MONTHS[first.getMonth()]} - ${last.getDate()} de ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
    };

    // Render modal content
    const renderModalContent = () => {
        const dataType = DATA_TYPES.find(dt => dt.key === selectedDataType)!;

        if (isLoadingSelected) {
            return (
                <View style={styles.modalLoading}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={[styles.modalLoadingText, { color: textSecondary }]}>Cargando datos...</Text>
                </View>
            );
        }

        if (selectedDateData.length === 0) {
            return (
                <View style={styles.modalEmpty}>
                    <Ionicons name={dataType.icon} size={48} color={textSecondary} />
                    <Text style={[styles.modalEmptyText, { color: textSecondary }]}>
                        No hay {dataType.title.toLowerCase()} para esta fecha
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.modalDataList}>
                {selectedDateData.map((item: any, index: number) => {
                    const badge = getStatusBadge(item.estado);
                    return (
                        <View key={index} style={[styles.modalDataRow, { borderColor }]}>
                            <View style={styles.modalDataIndex}>
                                <View style={[styles.indexCircle, { backgroundColor: `${dataType.color}20` }]}>
                                    <Text style={[styles.indexText, { color: dataType.color }]}>{index + 1}</Text>
                                </View>
                            </View>
                            <View style={styles.modalDataInfo}>
                                {selectedDataType === 'asistencias' && (
                                    <>
                                        <Text style={[styles.modalDataDate, { color: textPrimary }]}>
                                            {formatSimpleDate(item.fecha)} {item.hora || ''}
                                        </Text>
                                        <Text style={[styles.modalDataMonto, { color: textPrimary }]}>
                                            Sueldo: {formatCurrency(item.sueldo_final || 0)}
                                        </Text>
                                    </>
                                )}
                                {selectedDataType === 'anticipos' && (
                                    <>
                                        <Text style={[styles.modalDataDate, { color: textPrimary }]}>
                                            {formatSimpleDate(item.fecha_crea)}
                                        </Text>
                                        <Text style={[styles.modalDataMonto, { color: '#EF4444' }]}>
                                            {formatCurrency(item.monto || 0)}
                                        </Text>
                                    </>
                                )}
                                {selectedDataType === 'propinas' && (
                                    <>
                                        <Text style={[styles.modalDataDate, { color: textPrimary }]}>
                                            {formatSimpleDate(item.fecha_crea)}
                                        </Text>
                                        <Text style={[styles.modalDataMonto, { color: textPrimary }]}>
                                            {formatCurrency(item.monto || 0)}
                                        </Text>
                                    </>
                                )}
                                {selectedDataType === 'horasExtras' && (
                                    <>
                                        <Text style={[styles.modalDataDate, { color: textPrimary }]}>
                                            {formatSimpleDate(item.fecha_crea)} ({item.hora || 0}h)
                                        </Text>
                                        <Text style={[styles.modalDataMonto, { color: textPrimary }]}>
                                            {formatCurrency(item.total || 0)}
                                        </Text>
                                    </>
                                )}
                            </View>
                            <View style={[styles.modalDataBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.modalBadgeText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <PremiumHeader
                title="Calendario"
                subtitle="Vista mensual de eventos"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable onPress={onRefresh} style={styles.headerBtn}>
                            <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        </Pressable>
                        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.headerBtnText}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            {/* Navigation bar */}
            <View style={[styles.navBar, { backgroundColor: cardBg, borderColor }]}>
                <Pressable onPress={() => navigateMonth(-1)} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={22} color={textPrimary} />
                </Pressable>
                <Pressable onPress={goToToday}>
                    <Text style={[styles.navTitle, { color: textPrimary }]}>
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                </Pressable>
                <Pressable onPress={() => navigateMonth(1)} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={22} color={textPrimary} />
                </Pressable>
            </View>

            {/* Calendar grid */}
            <ScrollView
                style={styles.calendarScroll}
                contentContainerStyle={styles.calendarContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                }
            >
                {/* Weekday headers */}
                <View style={[styles.weekdayRow, { borderColor }]}>
                    {WEEKDAYS.map((day, i) => (
                        <View key={i} style={styles.weekdayCell}>
                            <Text style={[styles.weekdayText, { color: textSecondary }]}>{day}</Text>
                        </View>
                    ))}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={accentColor} />
                        <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando calendario...</Text>
                    </View>
                ) : (
                    <View style={styles.daysGrid}>
                        {days.map((day, index) => {
                            const hasData = day.data.asistencias || day.data.anticipos || day.data.propinas || day.data.horasExtras;
                            const isSelected = selectedDates.some(d => d.toDateString() === day.date.toDateString());

                            return (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.dayCell,
                                        isSelected && { backgroundColor: `${accentColor}20`, borderColor: accentColor },
                                        !day.isCurrentMonth && { opacity: 0.35 },
                                    ]}
                                    onPress={() => handleDayPress(day)}
                                >
                                    <View style={[
                                        styles.dayNumber,
                                        day.isToday && [styles.todayCircle, { backgroundColor: accentColor }],
                                    ]}>
                                        <Text style={[
                                            styles.dayNumberText,
                                            { color: day.isToday ? '#FFFFFF' : textPrimary },
                                            day.isToday && { fontWeight: '800' },
                                        ]}>
                                            {day.date.getDate()}
                                        </Text>
                                    </View>

                                    {/* Indicators */}
                                    <View style={styles.indicators}>
                                        {day.data.asistencias && <View style={[styles.indicator, { backgroundColor: '#10B981' }]} />}
                                        {day.data.anticipos && <View style={[styles.indicator, { backgroundColor: '#EF4444' }]} />}
                                        {day.data.propinas && <View style={[styles.indicator, { backgroundColor: '#F59E0B' }]} />}
                                        {day.data.horasExtras && <View style={[styles.indicator, { backgroundColor: '#8B5CF6' }]} />}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* Legend */}
                <View style={[styles.legend, { borderColor }]}>
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={[styles.legendText, { color: textSecondary }]}>Asistencia</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={[styles.legendText, { color: textSecondary }]}>Anticipo</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={[styles.legendText, { color: textSecondary }]}>Propina</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={[styles.legendText, { color: textSecondary }]}>HE</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Detail Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalDismiss} onPress={() => setModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>{formatSelectedDates()}</Text>
                            <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>

                        {/* Data type tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalTypeTabsScroll}>
                            <View style={styles.modalTypeTabs}>
                                {DATA_TYPES.map(dt => (
                                    <Pressable
                                        key={dt.key}
                                        style={[
                                            styles.modalTypeTab,
                                            selectedDataType === dt.key && { backgroundColor: dt.color, borderColor: dt.color },
                                            selectedDataType !== dt.key && { borderColor: borderColor },
                                        ]}
                                        onPress={() => setSelectedDataType(dt.key)}
                                    >
                                        <Ionicons name={dt.icon} size={16} color={selectedDataType === dt.key ? '#FFFFFF' : dt.color} />
                                        <Text style={[
                                            styles.modalTypeTabText,
                                            { color: selectedDataType === dt.key ? '#FFFFFF' : textSecondary },
                                        ]}>{dt.title}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Total a cobrar */}
                        <View style={[styles.totalBanner, { backgroundColor: `${accentColor}10`, borderColor: accentColor }]}>
                            <Text style={[styles.totalLabel, { color: textSecondary }]}>Total a Cobrar:</Text>
                            <Text style={[styles.totalValue, { color: accentColor }]}>{formatCurrency(totalCobrar)}</Text>
                        </View>

                        {/* Data list */}
                        {renderModalContent()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6,
    },
    headerBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '800',
    },

    calendarScroll: { flex: 1 },
    calendarContent: { paddingHorizontal: 16, paddingBottom: 40 },

    weekdayRow: {
        flexDirection: 'row',
        marginTop: 12,
        borderBottomWidth: 1,
        paddingBottom: 8,
    },
    weekdayCell: {
        width: `${100 / 7}%`,
        alignItems: 'center',
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
    },

    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 8,
    },
    dayNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayCircle: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    dayNumberText: {
        fontSize: 13,
        fontWeight: '600',
    },
    indicators: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    legend: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
    },
    modalContent: {
        maxHeight: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(150,150,150,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalTypeTabsScroll: {
        paddingVertical: 12,
    },
    modalTypeTabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    modalTypeTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1.5,
        gap: 6,
    },
    modalTypeTabText: {
        fontSize: 13,
        fontWeight: '700',
    },

    totalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '900',
    },

    modalLoading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    modalLoadingText: {
        fontSize: 14,
        fontWeight: '500',
    },

    modalEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    modalEmptyText: {
        fontSize: 14,
        fontWeight: '500',
    },

    modalDataList: {
        paddingHorizontal: 20,
        maxHeight: 300,
    },
    modalDataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    modalDataIndex: {},
    indexCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 14,
        fontWeight: '800',
    },
    modalDataInfo: {
        flex: 1,
    },
    modalDataDate: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalDataMonto: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2,
    },
    modalDataBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    modalBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
});
