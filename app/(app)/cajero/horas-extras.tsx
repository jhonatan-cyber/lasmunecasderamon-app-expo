import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useStableCallback } from '@/hooks/useStableCallback';
import {
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { apiClientSafe } from '@/api/client-safe';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { OvertimeRecord } from '@/hooks/useHorasExtrasScreen';

import {
    OvertimeStatsCards,
    EmployeeSummaryCard,
    OvertimeCard,
    OvertimeDetailModal
} from '@/components/cajero/horas-extras';

export default function HorasExtrasScreen() {
    const router = useRouter();
    const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const [data, setData] = useState<OvertimeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const dataRef = useRef<string>('');



    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const res = await apiClientSafe<OvertimeRecord[]>('/overtime');
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

    const handleCardPress = useCallback((item: OvertimeRecord) => {
        setSelectedRecord(item);
        setModalVisible(true);
    }, []);

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

    const stats = useMemo(() => {
        const totalRegistros = data.length;
        const totalMonto = data.reduce((sum, h) => sum + (h.monto || 0), 0);
        const totalHoras = data.reduce((sum, h) => sum + (h.hora || 0), 0);
        const totalAPagar = data.filter(h => h.estado === 1).reduce((sum, h) => sum + (h.total || h.monto || 0), 0);
        return { totalRegistros, totalMonto, totalHoras, totalAPagar };
    }, [data]);

    const renderItem = useStableCallback(({ item, index }: { item: OvertimeRecord; index: number }) => (
        <OvertimeCard
            item={item}
            index={index}
            accentColor={accentColor}
            cardBg={cardBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onPress={handleCardPress}
        />
    ));

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

            <OvertimeStatsCards
                stats={stats}
                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
            />

            <EmployeeSummaryCard
                perEmployeeStats={perEmployeeStats}
                userFilter={userFilter}
                setUserFilter={(uid) => setUserFilter(uid)}
                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
            />

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
                <FlatList
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

            <OvertimeDetailModal
                visible={modalVisible}
                record={selectedRecord}
                onClose={() => setModalVisible(false)}
                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                isDark={isDark}
            />
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
    empFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 12 },
    empFilterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, maxWidth: 130 },
    empFilterText: { fontSize: 11, fontWeight: '700' },
    filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 9999, borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 6 },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20, marginHorizontal: 16 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
