import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';

interface AttendanceDetail {
    id_asistencia: number;
    fecha: string;
    hora: string;
    estado: number;
    observaciones?: string;
    sueldo?: number;
    aporte?: number;
    descuento?: number;
    semanas_con_descuento?: number;
    sueldo_final?: number;
    descuento_total?: number;
    total_final?: number;
}

interface AttendanceSummary {
    id_usuario: number;
    nick: string;
    nombre_completo: string;
    usuario_foto: string | null;
    total_asistencias: number;
    sueldo_total: number;
    aporte_total: number;
    descuento_total: number;
    total_final: number;
    rol?: string;
}

export default function AsistenciasScreen() {
    const router = useRouter();
    const { accentColor, isDark } = useAccentColor();
    const [data, setData] = useState<AttendanceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'con_asistencias' | 'sin_asistencias'>('all');
    const [searchText, setSearchText] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<AttendanceSummary | null>(null);
    const [detailData, setDetailData] = useState<AttendanceDetail[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const dataRef = useRef<string>('');

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E2E8F0';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const res = await apiClient(`/attendance?month=${month}&year=${year}`);
            if (res.success) {
                const serialized = JSON.stringify(res.data);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;
                setData(res.data || []);
                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 2500,
                    });
                }
            } else {
                setError(res.message || 'Error al cargar asistencias');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentDate]);

    useFocusEffect(
        useCallback(() => { fetchData(); }, [fetchData])
    );

    const navigateMonth = (direction: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const goToCurrentMonth = () => {
        setCurrentDate(new Date());
    };

    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const searchedData = useMemo(() => {
        if (!searchText.trim()) return data;
        const q = searchText.toLowerCase();
        return data.filter(d =>
            d.nombre_completo?.toLowerCase().includes(q) ||
            d.nick?.toLowerCase().includes(q)
        );
    }, [data, searchText]);

    const filteredData = useMemo(() => {
        let result = searchedData;
        if (filter === 'con_asistencias') result = result.filter(d => d.total_asistencias > 0);
        else if (filter === 'sin_asistencias') result = result.filter(d => d.total_asistencias === 0);
        return result;
    }, [searchedData, filter]);

    // Global totals
    const totals = useMemo(() => {
        const totalEmpleados = data.length;
        const totalAsistencias = data.reduce((s, d) => s + (d.total_asistencias || 0), 0);
        const totalSueldo = data.reduce((s, d) => s + (d.sueldo_total || 0), 0);
        const totalAporte = data.reduce((s, d) => s + (d.aporte_total || 0), 0);
        const totalDescuento = data.reduce((s, d) => s + (d.descuento_total || 0), 0);
        const totalFinal = data.reduce((s, d) => s + (d.total_final || 0), 0);
        return { totalEmpleados, totalAsistencias, totalSueldo, totalAporte, totalDescuento, totalFinal };
    }, [data]);

    const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;
    const getInitials = (name: string) =>
        name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

    const openDetailModal = useCallback(async (employee: AttendanceSummary) => {
        setSelectedEmployee(employee);
        setModalVisible(true);
        setDetailLoading(true);
        setDetailData([]);
        try {
            const res = await apiClient(`/attendance/${employee.id_usuario}/detalle`);
            if (res.success) {
                setDetailData(res.data || []);
            }
        } catch {
            setDetailData([]);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const getStatusBadgeModal = (estado: number) => {
        switch (estado) {
            case 1: return { label: 'Por Pagar', color: '#D97706', bg: 'rgba(217,119,6,0.15)' };
            case 0: return { label: 'Pagado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
            default: return { label: 'Sin definir', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' };
        }
    };

    const renderEmployeeCard = (item: AttendanceSummary, index: number) => {
        const totalX = (item.sueldo_total || 0) - (item.aporte_total || 0) - (item.descuento_total || 0);
        return (
            <MotiView
                key={item.id_usuario}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 40 }}
            >
            <Pressable
                onPress={() => openDetailModal(item)}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
                <View style={styles.empHeader}>
                    <View style={[styles.avatar, { backgroundColor: accentColor + '20' }]}>
                        <Text style={[styles.avatarText, { color: accentColor }]}>
                            {getInitials(item.nombre_completo)}
                        </Text>
                    </View>
                    <View style={styles.empInfo}>
                        <Text style={[styles.empName, { color: textPrimary }]} numberOfLines={1}>
                            {item.nombre_completo}
                        </Text>
                        <View style={styles.empMeta}>
                            {item.rol && (
                                <View style={[styles.roleBadge, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                                    <Text style={[styles.roleText, { color: textSecondary }]}>{item.rol}</Text>
                                </View>
                            )}
                            <Text style={[styles.nickText, { color: textSecondary }]}>@{item.nick}</Text>
                        </View>
                    </View>
                    <View style={[styles.asistenciaBadge, { backgroundColor: item.total_asistencias > 0 ? '#10B98115' : '#EF444415' }]}>
                        <Text style={[styles.asistenciaBadgeText, { color: item.total_asistencias > 0 ? '#10B981' : '#EF4444' }]}>
                            {item.total_asistencias} días
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.amountsRow}>
                    <View style={styles.amountItem}>
                        <Text style={[styles.amountLabel, { color: textSecondary }]}>Sueldo</Text>
                        <Text style={[styles.amountValue, { color: textPrimary }]}>{formatCurrency(item.sueldo_total)}</Text>
                    </View>
                    <View style={styles.amountItem}>
                        <Text style={[styles.amountLabel, { color: textSecondary }]}>Aporte</Text>
                        <Text style={[styles.amountValue, { color: '#EF4444' }]}>-{formatCurrency(item.aporte_total)}</Text>
                    </View>
                    {item.descuento_total > 0 && (
                        <View style={styles.amountItem}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Desc.</Text>
                            <Text style={[styles.amountValue, { color: '#F59E0B' }]}>-{formatCurrency(item.descuento_total)}</Text>
                        </View>
                    )}
                    <View style={styles.amountItem}>
                        <Text style={[styles.amountLabel, { color: textSecondary }]}>Total</Text>                            <Text style={[styles.amountValueTotal, { color: accentColor }]}>{formatCurrency(totalX)}</Text>
                        </View>
                    </View>
                </Pressable>
            </MotiView>
        );
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return 'Sin hora';
        const d = new Date(timeString);
        if (isNaN(d.getTime())) return timeString.slice(0, 5) || 'Sin hora';
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bg }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <PremiumHeader title="Asistencias" subtitle="Resumen del personal" />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonLoader width="100%" height={80} borderRadius={20} />
                    <SkeletonLoader width="100%" height={120} borderRadius={18} />
                    <SkeletonLoader width="100%" height={120} borderRadius={18} />
                    <SkeletonLoader width="100%" height={120} borderRadius={18} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <PremiumHeader
                title="Asistencias"
                subtitle={`${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                rightComponent={
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backText}>Atrás</Text>
                    </Pressable>
                }
            />

            {/* Month navigation */}
            <View style={[styles.monthNav, { backgroundColor: cardBg, borderColor }]}>
                <Pressable onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
                    <Ionicons name="chevron-back" size={18} color={textPrimary} />
                </Pressable>
                <Pressable onPress={goToCurrentMonth} style={styles.monthNavLabel}>
                    <Text style={[styles.monthNavText, { color: textPrimary }]}>
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                </Pressable>
                <Pressable onPress={() => navigateMonth(1)} style={styles.monthNavBtn}>
                    <Ionicons name="chevron-forward" size={18} color={textPrimary} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                }
            >
                {/* Global Summary */}
                <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.summaryHeader}>
                        <Text style={[styles.summaryTitle, { color: textPrimary }]}>Resumen Global</Text>
                        <Text style={[styles.summaryCount, { color: textSecondary }]}>
                            {totals.totalEmpleados} empleados · {totals.totalAsistencias} asistencias
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Sueldo</Text>
                            <Text style={[styles.summaryValue, { color: textPrimary }]}>{formatCurrency(totals.totalSueldo)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Aporte</Text>
                            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>-{formatCurrency(totals.totalAporte)}</Text>
                        </View>
                        {totals.totalDescuento > 0 && (
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Descuento</Text>
                                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>-{formatCurrency(totals.totalDescuento)}</Text>
                            </View>
                        )}
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total a Pagar</Text>
                            <Text style={[styles.summaryValueLarge, { color: accentColor }]}>{formatCurrency(totals.totalFinal)}</Text>
                        </View>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={{ marginHorizontal: 16, marginTop: 12 }}>
                    <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor: isDark ? '#333' : '#E5E7EB' }]}>
                        <Ionicons name="search" size={16} color={textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: textPrimary }]}
                            placeholder="Buscar por nombre o nick..."
                            placeholderTextColor={textSecondary}
                            value={searchText}
                            onChangeText={setSearchText}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <Pressable onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color={textSecondary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Filter Row */}
                <View style={styles.filterRow}>
                    {(['all', 'con_asistencias', 'sin_asistencias'] as const).map(item => (
                        <Pressable
                            key={item}
                            style={[styles.filterBtn, { backgroundColor: filter === item ? accentColor : cardBg, borderColor: filter === item ? accentColor : borderColor }]}
                            onPress={() => setFilter(item)}
                        >
                            <Text style={[styles.filterText, { color: filter === item ? '#FFFFFF' : textSecondary }]}>
                                {item === 'all' ? 'Todos' : item === 'con_asistencias' ? 'Con asistencias' : 'Sin asistencias'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {error ? (
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>{error}</Text>
                    </View>
                ) : filteredData.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="people-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No hay empleados en esta categoría</Text>
                    </View>
                ) : (
                    <View style={styles.listContent}>
                        {filteredData.map((item, index) => renderEmployeeCard(item, index))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Detail Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
                    <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                <View style={[styles.modalAvatar, { backgroundColor: accentColor + '20' }]}>
                                    <Text style={[styles.modalAvatarText, { color: accentColor }]}>
                                        {selectedEmployee ? getInitials(selectedEmployee.nombre_completo) : '??'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalTitle, { color: textPrimary }]} numberOfLines={1}>
                                        {selectedEmployee?.nombre_completo}
                                    </Text>
                                    <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                        @{selectedEmployee?.nick}
                                    </Text>
                                </View>
                                <Pressable onPress={() => setModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                                    <Ionicons name="close" size={20} color={textPrimary} />
                                </Pressable>
                            </View>
                        </View>

                        {detailLoading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={accentColor} />
                                <Text style={[styles.modalLoadingText, { color: textSecondary }]}>Cargando asistencias...</Text>
                            </View>
                        ) : detailData.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={44} color={textSecondary} />
                                <Text style={[styles.modalEmptyText, { color: textSecondary }]}>No hay asistencias registradas</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
                                {/* Financial Summary */}
                                <View style={[styles.modalSummaryCard, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor }]}>
                                    <Text style={[styles.modalSummaryTitle, { color: textSecondary }]}>Resumen Financiero</Text>
                                    <View style={{ gap: 8, marginTop: 8 }}>
                                        <View style={styles.modalSummaryRow}>
                                            <Text style={[styles.modalSummaryLabel, { color: textSecondary }]}>Total sueldos</Text>
                                            <Text style={[styles.modalSummaryValue, { color: textPrimary }]}>
                                                {formatCurrency(detailData.reduce((s, a) => s + (a.sueldo || 0), 0))}
                                            </Text>
                                        </View>
                                        <View style={styles.modalSummaryRow}>
                                            <Text style={[styles.modalSummaryLabel, { color: textSecondary }]}>Total aportes</Text>
                                            <Text style={[styles.modalSummaryValue, { color: '#EF4444' }]}>
                                                -{formatCurrency(detailData.reduce((s, a) => s + (a.aporte || 0), 0))}
                                            </Text>
                                        </View>
                                        {detailData.reduce((s, a) => s + (a.descuento_total || 0), 0) > 0 && (
                                            <View style={styles.modalSummaryRow}>
                                                <Text style={[styles.modalSummaryLabel, { color: textSecondary }]}>Descuento habitación</Text>
                                                <Text style={[styles.modalSummaryValue, { color: '#F59E0B' }]}>
                                                    -{formatCurrency(detailData.reduce((s, a) => s + (a.descuento_total || 0), 0))}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={[styles.modalSummaryDivider, { backgroundColor: borderColor }]} />
                                        <View style={styles.modalSummaryRow}>
                                            <Text style={[styles.modalSummaryLabelBold, { color: textPrimary }]}>Total a pagar</Text>
                                            <Text style={[styles.modalSummaryValueBold, { color: accentColor }]}>
                                                {formatCurrency(
                                                    detailData.reduce((s, a) => s + (a.sueldo || 0), 0) -
                                                    detailData.reduce((s, a) => s + (a.aporte || 0), 0) -
                                                    detailData.reduce((s, a) => s + (a.descuento_total || 0), 0)
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Attendance List */}
                                <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>Registro de Asistencias</Text>
                                {detailData.map((item, idx) => {
                                    const status = getStatusBadgeModal(item.estado);
                                    return (
                                        <MotiView
                                            key={item.id_asistencia}
                                            from={{ opacity: 0, translateX: -10 }}
                                            animate={{ opacity: 1, translateX: 0 }}
                                            transition={{ delay: idx * 50 }}
                                            style={[styles.modalRecordCard, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor }]}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                                                        <Text style={[styles.modalRecordDate, { color: textPrimary }]}>{formatDate(item.fecha)}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        <Ionicons name="time-outline" size={14} color={textSecondary} />
                                                        <Text style={[styles.modalRecordTime, { color: textSecondary }]}>Hora: {formatTime(item.hora)}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.modalStatusBadge, { backgroundColor: status.bg }]}>
                                                    <View style={[styles.modalStatusDot, { backgroundColor: status.color }]} />
                                                    <Text style={[styles.modalStatusText, { color: status.color }]}>{status.label}</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.modalRecordDivider, { backgroundColor: borderColor }]} />
                                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.modalRecordLabel, { color: textSecondary }]}>Sueldo</Text>
                                                    <Text style={[styles.modalRecordValue, { color: textPrimary }]}>{formatCurrency(item.sueldo || 0)}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.modalRecordLabel, { color: textSecondary }]}>Aporte AFP</Text>
                                                    <Text style={[styles.modalRecordValue, { color: '#EF4444' }]}>{formatCurrency(item.aporte || 0)}</Text>
                                                </View>
                                                {(item.descuento || 0) > 0 && (
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.modalRecordLabel, { color: textSecondary }]}>Desc.</Text>
                                                        <Text style={[styles.modalRecordValue, { color: '#F59E0B' }]}>{formatCurrency(item.descuento || 0)}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </MotiView>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 14,
        paddingHorizontal: 14, height: 44, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500', height: '100%' },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, gap: 6,
    },
    backText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    scrollContent: { paddingBottom: 20 },
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, borderWidth: 1 },
    summaryHeader: { marginBottom: 4 },
    summaryTitle: { fontSize: 16, fontWeight: '900' },
    summaryCount: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, marginVertical: 12 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    summaryItem: { flex: 1, minWidth: '40%' },
    summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    summaryValue: { fontSize: 16, fontWeight: '800' },
    summaryValueLarge: { fontSize: 20, fontWeight: '900' },
    filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
    filterBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 9999, borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingTop: 10, gap: 12 },
    card: { borderRadius: 18, borderWidth: 1, padding: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
    empHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 15, fontWeight: '900' },
    empInfo: { flex: 1 },
    empName: { fontSize: 15, fontWeight: '800' },
    empMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
    roleText: { fontSize: 10, fontWeight: '600' },
    nickText: { fontSize: 11, fontWeight: '500' },
    asistenciaBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
    asistenciaBadgeText: { fontSize: 11, fontWeight: '800' },
    amountsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    amountItem: { alignItems: 'center', flex: 1 },
    amountLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
    amountValue: { fontSize: 14, fontWeight: '700' },
    amountValueTotal: { fontSize: 16, fontWeight: '900' },
    monthNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingVertical: 10,
        paddingHorizontal: 12, borderWidth: 1,
    },
    monthNavBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    monthNavLabel: { flex: 1, alignItems: 'center' },
    monthNavText: { fontSize: 15, fontWeight: '800' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20, marginHorizontal: 16 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '85%', minHeight: '50%', overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    },
    modalAvatar: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalAvatarText: { fontSize: 14, fontWeight: '900' },
    modalTitle: { fontSize: 16, fontWeight: '900' },
    modalSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    modalCloseBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    modalLoadingText: { fontSize: 13, fontWeight: '600', marginTop: 12 },
    modalEmptyText: { fontSize: 13, fontWeight: '600', marginTop: 12 },
    modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    modalSummaryCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
    modalSummaryTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    modalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalSummaryLabel: { fontSize: 13, fontWeight: '500' },
    modalSummaryLabelBold: { fontSize: 13, fontWeight: '800' },
    modalSummaryValue: { fontSize: 14, fontWeight: '700' },
    modalSummaryValueBold: { fontSize: 16, fontWeight: '900' },
    modalSummaryDivider: { height: 1, marginVertical: 6 },
    modalSectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
    modalRecordCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
    modalRecordDate: { fontSize: 13, fontWeight: '700' },
    modalRecordTime: { fontSize: 12, fontWeight: '500' },
    modalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    modalStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
    modalStatusText: { fontSize: 10, fontWeight: '800' },
    modalRecordDivider: { height: 1, marginVertical: 8 },
    modalRecordLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
    modalRecordValue: { fontSize: 13, fontWeight: '700' },
});
