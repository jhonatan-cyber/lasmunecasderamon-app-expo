import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
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
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';

interface OvertimeRecord {
    id_hora_extra: number;
    usuario_id: number;
    usuario: string;
    usuario_foto?: string | null;
    fecha_crea: string;
    fecha_mod: string | null;
    hora: number;
    monto: number;
    total: number;
    estado: number;
}

const statusConfig: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'Pagado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    1: { label: 'Por cobrar', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
};

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

export default function HorasExtrasScreen() {
    const router = useRouter();
    const { accentColor, isDark } = useAccentColor();
    const [data, setData] = useState<OvertimeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const dataRef = useRef<string>('');

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E2E8F0';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const res = await apiClient('/overtime');
            if (res.success) {
                const serialized = JSON.stringify(res.data);
                dataRef.current = serialized;
                setData(res.data || []);
            } else {
                setError(res.message || 'Error al cargar horas extras');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => { fetchData(); }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    // Unique employees for filter
    const employees = useMemo(() => {
        const map = new Map<number, { id: number; name: string }>();
        data.forEach(h => {
            if (!map.has(h.usuario_id)) {
                map.set(h.usuario_id, { id: h.usuario_id, name: h.usuario });
            }
        });
        return Array.from(map.values());
    }, [data]);

    const filteredData = useMemo(() => {
        let result = data;
        if (statusFilter !== 'all') {
            const estado = statusFilter === 'pendiente' ? 1 : 0;
            result = result.filter(h => h.estado === estado);
        }
        if (userFilter !== 'all') {
            result = result.filter(h => h.usuario_id === Number(userFilter));
        }
        return result;
    }, [data, statusFilter, userFilter]);

    // Per-employee summary
    const perEmployeeStats = useMemo(() => {
        const map = new Map<number, { usuario_id: number; usuario: string; totalHoras: number; totalMonto: number; totalACobrar: number; count: number }>();
        data.forEach(h => {
            const existing = map.get(h.usuario_id);
            if (existing) {
                existing.totalHoras += h.hora || 0;
                existing.totalMonto += h.monto || 0;
                if (h.estado === 1) existing.totalACobrar += (h.total || h.monto || 0);
                existing.count++;
            } else {
                map.set(h.usuario_id, {
                    usuario_id: h.usuario_id,
                    usuario: h.usuario,
                    totalHoras: h.hora || 0,
                    totalMonto: h.monto || 0,
                    totalACobrar: h.estado === 1 ? (h.total || h.monto || 0) : 0,
                    count: 1,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => b.totalMonto - a.totalMonto);
    }, [data]);

    // Stats
    const stats = useMemo(() => {
        const totalRegistros = data.length;
        const totalMonto = data.reduce((sum, h) => sum + (h.monto || 0), 0);
        const totalHoras = data.reduce((sum, h) => sum + (h.hora || 0), 0);
        const totalAPagar = data.filter(h => h.estado === 1).reduce((sum, h) => sum + (h.total || h.monto || 0), 0);
        return { totalRegistros, totalMonto, totalHoras, totalAPagar };
    }, [data]);

    const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

    const renderItem = ({ item, index }: { item: OvertimeRecord; index: number }) => {
        const status = statusConfig[item.estado] || statusConfig[1];
        const fecha = new Date(item.fecha_crea);
        return (
            <MotiView
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: index * 30 }}
            >
            <Pressable
                onPress={() => { setSelectedRecord(item); setModalVisible(true); }}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
                <View style={styles.empHeader}>
                    <View style={[styles.avatar, { backgroundColor: accentColor + '20' }]}>
                        <Text style={[styles.avatarText, { color: accentColor }]}>
                            {getInitials(item.usuario)}
                        </Text>
                    </View>
                    <View style={styles.empInfo}>
                        <Text style={[styles.empName, { color: textPrimary }]} numberOfLines={1}>
                            {item.usuario}
                        </Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={11} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textSecondary }]}>
                                {fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.amountRow}>
                    <View style={styles.amountItem}>
                        <Ionicons name="time-outline" size={13} color="#3B82F6" />
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Horas</Text>
                            <Text style={[styles.amountValue, { color: textPrimary }]}>{item.hora.toFixed(1)} hrs</Text>
                        </View>
                    </View>
                    <View style={styles.amountItem}>
                        <Ionicons name="cash-outline" size={13} color="#10B981" />
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto</Text>
                            <Text style={[styles.amountValue, { color: textPrimary }]}>{formatCurrency(item.monto)}</Text>
                        </View>
                    </View>                        <View style={styles.amountItem}>
                        <Ionicons name="wallet-outline" size={13} color={accentColor} />
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Total</Text>
                            <Text style={[styles.amountValueTotal, { color: accentColor }]}>{formatCurrency(item.total || item.monto)}</Text>
                        </View>
                    </View>
                </View>
            </Pressable>
            </MotiView>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bg }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <PremiumHeader title="Horas Extras" subtitle="Registro del personal" />
                <View style={{ padding: 16, gap: 12 }}>
                    <SkeletonLoader width="100%" height={100} borderRadius={20} />
                    <SkeletonLoader width="100%" height={140} borderRadius={18} />
                    <SkeletonLoader width="100%" height={140} borderRadius={18} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <PremiumHeader
                title="Horas Extras"
                subtitle={`${data.length} registros · ${employees.length} empleados`}
                rightComponent={
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backText}>Atrás</Text>
                    </Pressable>
                }
            />

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={[styles.statIconBox, { backgroundColor: '#3B82F615' }]}>
                        <Ionicons name="time-outline" size={18} color="#3B82F6" />
                    </View>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Horas</Text>
                    <Text style={[styles.statValue, { color: textPrimary }]}>{stats.totalHoras.toFixed(1)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={[styles.statIconBox, { backgroundColor: '#10B98115' }]}>
                        <Ionicons name="cash-outline" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Total Monto</Text>
                    <Text style={[styles.statValue, { color: textPrimary }]}>{formatCurrency(stats.totalMonto)}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={[styles.statIconBox, { backgroundColor: `${accentColor}15` }]}>
                        <Ionicons name="wallet-outline" size={18} color={accentColor} />
                    </View>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Por Cobrar</Text>
                    <Text style={[styles.statValue, { color: accentColor }]}>{formatCurrency(stats.totalAPagar)}</Text>
                </View>
            </View>

            {/* Per-employee summary cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
                    {perEmployeeStats.map(emp => (
                        <Pressable
                            key={emp.usuario_id}
                            onPress={() => setUserFilter(userFilter === String(emp.usuario_id) ? 'all' : String(emp.usuario_id))}
                            style={[
                                styles.empSummaryCard,
                                {
                                    backgroundColor: userFilter === String(emp.usuario_id) ? `${accentColor}15` : cardBg,
                                    borderColor: userFilter === String(emp.usuario_id) ? accentColor : borderColor,
                                }
                            ]}
                        >
                            <View style={[styles.empSummaryAvatar, { backgroundColor: accentColor + '20' }]}>
                                <Text style={[styles.empSummaryInitials, { color: accentColor }]}>{getInitials(emp.usuario)}</Text>
                            </View>
                            <View style={{ gap: 2 }}>
                                <Text style={[styles.empSummaryName, { color: textPrimary }]} numberOfLines={1}>
                                    {emp.usuario.split(' ')[0]}
                                </Text>
                                <Text style={[styles.empSummaryStat, { color: textSecondary }]}>
                                    {emp.totalHoras.toFixed(1)}h · {emp.count} reg.
                                </Text>
                                <Text style={[styles.empSummaryAmount, { color: emp.totalACobrar > 0 ? '#F59E0B' : textPrimary }]}>
                                    {formatCurrency(emp.totalMonto)}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            {/* Employee Filter Chips */}
            {employees.length > 1 && (
                <View style={styles.empFilterRow}>
                    <Pressable
                        style={[styles.empFilterChip, { backgroundColor: userFilter === 'all' ? accentColor : cardBg, borderColor: userFilter === 'all' ? accentColor : borderColor }]}
                        onPress={() => setUserFilter('all')}
                    >
                        <Text style={[styles.empFilterText, { color: userFilter === 'all' ? '#FFFFFF' : textSecondary }]}>Todos</Text>
                    </Pressable>
                    {employees.slice(0, 8).map(emp => (
                        <Pressable
                            key={emp.id}
                            style={[styles.empFilterChip, { backgroundColor: userFilter === String(emp.id) ? accentColor : cardBg, borderColor: userFilter === String(emp.id) ? accentColor : borderColor }]}
                            onPress={() => setUserFilter(userFilter === String(emp.id) ? 'all' : String(emp.id))}
                        >
                            <Text style={[styles.empFilterText, { color: userFilter === String(emp.id) ? '#FFFFFF' : textSecondary }]} numberOfLines={1}>
                                {emp.name.split(' ')[0]}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Status Filter */}
            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map(item => (
                    <Pressable
                        key={item}
                        style={[styles.filterBtn, { backgroundColor: statusFilter === item ? accentColor : cardBg, borderColor: statusFilter === item ? accentColor : borderColor }]}
                        onPress={() => setStatusFilter(item)}
                    >
                        <Text style={[styles.filterText, { color: statusFilter === item ? '#FFFFFF' : textSecondary }]}>
                            {item === 'all' ? 'Todas' : item === 'pendiente' ? 'Por cobrar' : 'Pagado'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                    <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
                    <Text style={[styles.emptyText, { color: textSecondary }]}>{error}</Text>
                </View>
            ) : (
                <FlashList
                    data={filteredData}
                    keyExtractor={item => String(item.id_hora_extra)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                    }
                    ListEmptyComponent={
                        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                            <Ionicons name="moon-outline" size={48} color={textSecondary} />
                            <Text style={[styles.emptyText, { color: textSecondary }]}>No hay horas extras registradas</Text>
                        </View>
                    }
                />
            )}

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
                                        {selectedRecord ? getInitials(selectedRecord.usuario) : '??'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalTitle, { color: textPrimary }]} numberOfLines={1}>
                                        {selectedRecord?.usuario || 'Empleado'}
                                    </Text>
                                    <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                        {selectedRecord ? new Date(selectedRecord.fecha_crea).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                                    </Text>
                                </View>
                                <Pressable onPress={() => setModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                                    <Ionicons name="close" size={20} color={textPrimary} />
                                </Pressable>
                            </View>
                        </View>

                        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 30 }}>
                            {selectedRecord && (() => {
                                const status = statusConfig[selectedRecord.estado] || statusConfig[1];
                                const fecCrea = new Date(selectedRecord.fecha_crea);
                                const fecMod = selectedRecord.fecha_mod ? new Date(selectedRecord.fecha_mod) : null;
                                return (
                                    <>
                                        {/* Status Banner */}
                                        <View style={[styles.modalStatusBanner, { backgroundColor: status.bg }]}>
                                            <View style={[styles.modalStatusDot, { backgroundColor: status.color }]} />
                                            <Text style={[styles.modalStatusBannerText, { color: status.color }]}>{status.label}</Text>
                                        </View>

                                        {/* Detail Cards */}
                                        <View style={[styles.modalDetailCard, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor }]}>
                                            <Text style={[styles.modalDetailSectionTitle, { color: textSecondary }]}>Información del Registro</Text>
                                            <View style={{ gap: 12, marginTop: 10 }}>                                                    <View style={styles.modalDetailRow}>
                                                    <View style={[styles.modalDetailIconBox, { backgroundColor: `${accentColor}15` }]}>
                                                        <Ionicons name="person-outline" size={16} color={accentColor} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.modalDetailLabel, { color: textSecondary }]}>Empleado</Text>
                                                        <Text style={[styles.modalDetailValue, { color: textPrimary }]}>{selectedRecord.usuario}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.modalDetailRow}>
                                                    <View style={[styles.modalDetailIconBox, { backgroundColor: '#3B82F615' }]}>
                                                        <Ionicons name="time-outline" size={16} color="#3B82F6" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.modalDetailLabel, { color: textSecondary }]}>Horas extras</Text>
                                                        <Text style={[styles.modalDetailValue, { color: textPrimary }]}>{selectedRecord.hora.toFixed(1)} horas</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.modalDetailRow}>
                                                    <View style={[styles.modalDetailIconBox, { backgroundColor: '#8B5CF615' }]}>
                                                        <Ionicons name="cash-outline" size={16} color="#8B5CF6" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.modalDetailLabel, { color: textSecondary }]}>Valor por hora</Text>
                                                        <Text style={[styles.modalDetailValue, { color: textPrimary }]}>{formatCurrency(selectedRecord.monto)}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Total Card */}
                                        <View style={[styles.modalTotalCard, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.modalTotalLabel, { color: textSecondary }]}>Total a pagar</Text>
                                                <Text style={[styles.modalTotalValue, { color: accentColor }]}>
                                                    {formatCurrency(selectedRecord.total || selectedRecord.monto)}
                                                </Text>
                                            </View>
                                            <Ionicons name="checkmark-circle" size={32} color={accentColor} />
                                        </View>

                                        {/* Metadata */}
                                        <View style={[styles.modalDetailCard, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor }]}>
                                            <Text style={[styles.modalDetailSectionTitle, { color: textSecondary }]}>Metadatos</Text>
                                            <View style={{ gap: 8, marginTop: 10 }}>
                                                <View style={styles.modalMetaRow}>
                                                    <Text style={[styles.modalMetaLabel, { color: textSecondary }]}>ID Registro</Text>
                                                    <Text style={[styles.modalMetaValue, { color: textPrimary }]}>#{selectedRecord.id_hora_extra}</Text>
                                                </View>
                                                <View style={styles.modalMetaRow}>
                                                    <Text style={[styles.modalMetaLabel, { color: textSecondary }]}>Fecha creación</Text>
                                                    <Text style={[styles.modalMetaValue, { color: textPrimary }]}>
                                                        {fecCrea.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                                {fecMod && (
                                                    <View style={styles.modalMetaRow}>
                                                        <Text style={[styles.modalMetaLabel, { color: textSecondary }]}>Última modificación</Text>
                                                        <Text style={[styles.modalMetaValue, { color: textPrimary }]}>
                                                            {fecMod.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, gap: 6,
    },
    backText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
    statCard: { flex: 1, borderRadius: 16, padding: 12, borderWidth: 1, alignItems: 'center', gap: 3 },
    statIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    statLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 14, fontWeight: '900' },
    empFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 12 },
    empFilterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, maxWidth: 130 },
    empFilterText: { fontSize: 11, fontWeight: '700' },
    filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 9999, borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 6 },
    card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
    empHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatar: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 12, fontWeight: '900' },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '800' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    dateText: { fontSize: 11, fontWeight: '500' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800' },
    divider: { height: 1, marginBottom: 10 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    amountLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    amountValue: { fontSize: 13, fontWeight: '700' },
    amountValueTotal: { fontSize: 15, fontWeight: '900' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20, marginHorizontal: 16 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
    empSummaryCard: {
        borderRadius: 16, borderWidth: 1, padding: 12, minWidth: 140,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
    },
    empSummaryAvatar: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    empSummaryInitials: { fontSize: 12, fontWeight: '900' },
    empSummaryName: { fontSize: 12, fontWeight: '800', maxWidth: 90 },
    empSummaryStat: { fontSize: 10, fontWeight: '600' },
    empSummaryAmount: { fontSize: 13, fontWeight: '900' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '85%', minHeight: '40%', overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    },
    modalAvatar: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalAvatarText: { fontSize: 14, fontWeight: '900' },
    modalTitle: { fontSize: 16, fontWeight: '900' },
    modalSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    modalCloseBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    modalStatusBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 12, borderRadius: 14, marginBottom: 16,
    },
    modalStatusDot: { width: 8, height: 8, borderRadius: 4 },
    modalStatusBannerText: { fontSize: 14, fontWeight: '800' },
    modalDetailCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 14 },
    modalDetailSectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    modalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modalDetailIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    modalDetailLabel: { fontSize: 11, fontWeight: '500' },
    modalDetailValue: { fontSize: 15, fontWeight: '800' },
    modalTotalCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14,
    },
    modalTotalLabel: { fontSize: 12, fontWeight: '600' },
    modalTotalValue: { fontSize: 22, fontWeight: '900', marginTop: 2 },
    modalMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalMetaLabel: { fontSize: 12, fontWeight: '500' },
    modalMetaValue: { fontSize: 13, fontWeight: '700' },
});
