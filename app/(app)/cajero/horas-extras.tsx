import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList ,
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useStableCallback } from '@/hooks/useStableCallback';

import { apiClientSafe } from '@/api/client-safe';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { showToast } from '@/utils/toast-lazy';
import { overtimeService } from '@/services/overtime';
import { OvertimeRecord } from '@/hooks/types/overtimeTypes';

import {
    OvertimeStatsCards,
    EmployeeSummaryCard,
    OvertimeCard,
    OvertimeDetailModal
} from '@/components/cajero/horas-extras';

export default function HorasExtrasScreen() {
    const router = useRouter();
    const esAdmin = useIsAdmin();
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

    const [createVisible, setCreateVisible] = useState(false);
    const [employeesList, setEmployeesList] = useState<{ id: string; name: string; lastName: string; nick?: string }[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; lastName: string } | null>(null);
    const [horasInput, setHorasInput] = useState('');
    const [montoInput, setMontoInput] = useState('');
    const [submitting, setSubmitting] = useState(false);



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

    const openCreate = useCallback(async () => {
        setSelectedEmployee(null);
        setEmployeeSearch('');
        setHorasInput('');
        setMontoInput('');
        setCreateVisible(true);
        if (employeesList.length > 0) return;
        try {
            setEmployeesLoading(true);
            const res = await apiClientSafe<any[]>('/users?status=active');
            if (res.success && Array.isArray(res.data)) {
                setEmployeesList(
                    res.data
                        .map((u: any) => ({
                            id: String(u.id ?? u.id_usuario ?? ''),
                            name: u.name ?? u.nombre ?? '',
                            lastName: u.lastName ?? u.apellido ?? '',
                            nick: u.nick ?? '',
                            role: u.role ?? u.rol ?? '',
                        }))
                        .filter((u) => u.id && !/(administrador|admin)/i.test(u.role || ''))
                );
            }
        } catch (err: any) {
            showToast({ type: 'error', text1: 'Error', text2: err?.message || 'No se pudo cargar el personal' });
        } finally {
            setEmployeesLoading(false);
        }
    }, [employeesList.length]);

    const handleCreate = useCallback(async () => {
        if (!selectedEmployee) {
            showToast({ type: 'error', text1: 'Falta el trabajador', text2: 'Selecciona a quién corresponde la hora extra' });
            return;
        }
        const horas = Number(horasInput.replace(/\D/g, ''));
        const monto = Number(montoInput.replace(/\D/g, ''));
        if (!horas || horas <= 0) {
            showToast({ type: 'error', text1: 'Horas inválidas', text2: 'Ingresa una cantidad de horas mayor a 0' });
            return;
        }
        if (!monto || monto <= 0) {
            showToast({ type: 'error', text1: 'Monto inválido', text2: 'Ingresa una tarifa por hora mayor a 0' });
            return;
        }
        try {
            setSubmitting(true);
            const res = await overtimeService.create({
                usuario_id: selectedEmployee.id,
                hora: horas,
                monto,
                device_date: new Date().toISOString(),
            });
            if (!res.success) throw new Error(res.message || 'No se pudo registrar la hora extra');
            showToast({ type: 'success', text1: 'Hora extra registrada', text2: `${horas} h para ${selectedEmployee.name}` });
            setCreateVisible(false);
            await fetchData();
        } catch (err: any) {
            showToast({ type: 'error', text1: 'Error', text2: err?.message || 'No se pudo registrar' });
        } finally {
            setSubmitting(false);
        }
    }, [selectedEmployee, horasInput, montoInput, fetchData]);

    const employees = useMemo(() => {
        const map = new Map<number, { id: number; name: string }>();
        data.forEach(h => {
            if (!map.has(h.usuario_id)) {
                map.set(h.usuario_id, { id: h.usuario_id, name: h.usuario });
            }
        });
        return Array.from(map.values());
    }, [data]);

    const filteredEmployeesList = useMemo(() => {
        const term = employeeSearch.trim().toLowerCase();
        if (!term) return employeesList;
        return employeesList.filter(emp =>
            `${emp.name} ${emp.lastName} ${emp.nick || ''}`.toLowerCase().includes(term)
        );
    }, [employeesList, employeeSearch]);

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {esAdmin && (
                            <Pressable onPress={openCreate} style={styles.addBtn} accessibilityLabel="Registrar hora extra">
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                <Text style={styles.backText}>Registrar</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backText}>Atrás</Text>
                        </Pressable>
                    </View>
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

            <Modal
                visible={createVisible}
                transparent
                animationType="slide"
                onRequestClose={() => !submitting && setCreateVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>Registrar hora extra</Text>
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                    Total = horas × tarifa
                                </Text>
                            </View>
                            <Pressable onPress={() => !submitting && setCreateVisible(false)} hitSlop={10}>
                                <Ionicons name="close" size={22} color={textSecondary} />
                            </Pressable>
                        </View>

                        <Text style={[styles.fieldLabel, { color: textSecondary }]}>Trabajador</Text>
                        {selectedEmployee ? (
                            <Pressable
                                style={[styles.selectedEmployee, { borderColor: accentColor, backgroundColor: `${accentColor}14` }]}
                                onPress={() => setSelectedEmployee(null)}
                            >
                                <Ionicons name="person-circle-outline" size={20} color={accentColor} />
                                <Text style={[styles.selectedEmployeeText, { color: textPrimary }]} numberOfLines={1}>
                                    {selectedEmployee.name} {selectedEmployee.lastName}
                                </Text>
                                <Ionicons name="close-circle" size={18} color={textSecondary} />
                            </Pressable>
                        ) : (
                            <>
                                <TextInput
                                    style={[styles.input, { color: textPrimary, borderColor, backgroundColor: isDark ? '#111111' : '#F8FAFC' }]}
                                    placeholder="Buscar trabajador…"
                                    placeholderTextColor={textSecondary}
                                    value={employeeSearch}
                                    onChangeText={setEmployeeSearch}
                                />
                                <View style={[styles.employeeList, { borderColor }]}>
                                    {employeesLoading ? (
                                        <ActivityIndicator style={{ paddingVertical: 20 }} color={accentColor} />
                                    ) : filteredEmployeesList.length === 0 ? (
                                        <Text style={[styles.emptyEmployees, { color: textSecondary }]}>Sin trabajadores</Text>
                                    ) : (
                                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                                            {filteredEmployeesList.map(emp => (
                                                <Pressable
                                                    key={emp.id}
                                                    style={[styles.employeeRow, { borderBottomColor: borderColor }]}
                                                    onPress={() => setSelectedEmployee({ id: emp.id, name: emp.name, lastName: emp.lastName })}
                                                >
                                                    <Text style={[styles.employeeName, { color: textPrimary }]} numberOfLines={1}>
                                                        {emp.name} {emp.lastName}
                                                    </Text>
                                                    {emp.nick ? (
                                                        <Text style={[styles.employeeNick, { color: textSecondary }]} numberOfLines={1}>
                                                            {emp.nick}
                                                        </Text>
                                                    ) : null}
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            </>
                        )}

                        <View style={styles.fieldRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Horas</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary, borderColor, backgroundColor: isDark ? '#111111' : '#F8FAFC' }]}
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                    keyboardType="number-pad"
                                    value={horasInput}
                                    onChangeText={(text) => setHorasInput(text.replace(/\D/g, ''))}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Tarifa por hora</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary, borderColor, backgroundColor: isDark ? '#111111' : '#F8FAFC' }]}
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                    keyboardType="number-pad"
                                    value={montoInput}
                                    onChangeText={(text) => {
                                        const clean = text.replace(/\D/g, '');
                                        setMontoInput(clean ? Number(clean).toLocaleString('de-DE') : '');
                                    }}
                                />
                            </View>
                        </View>

                        <View style={[styles.totalPreview, { borderTopColor: borderColor }]}>
                            <Text style={[styles.totalPreviewLabel, { color: textSecondary }]}>TOTAL</Text>
                            <Text style={[styles.totalPreviewValue, { color: accentColor }]}>
                                ${((Number(horasInput) || 0) * (Number(montoInput.replace(/\D/g, '')) || 0)).toLocaleString('de-DE')}
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalBtn, { borderColor, backgroundColor: 'transparent' }]}
                                onPress={() => !submitting && setCreateVisible(false)}
                                disabled={submitting}
                            >
                                <Text style={[styles.modalBtnText, { color: textSecondary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: accentColor, borderColor: accentColor }, submitting && { opacity: 0.6 }]}
                                onPress={handleCreate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Registrar</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    addBtn: {
        flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, gap: 4,
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalCard: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1,
        padding: 20, paddingBottom: 28, maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    modalSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600' },
    employeeList: { borderWidth: 1, borderRadius: 12, marginTop: 8, overflow: 'hidden' },
    employeeRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    employeeName: { fontSize: 14, fontWeight: '700' },
    employeeNick: { fontSize: 11, fontWeight: '500', marginTop: 1 },
    emptyEmployees: { fontSize: 13, fontWeight: '500', textAlign: 'center', paddingVertical: 20 },
    selectedEmployee: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    },
    selectedEmployeeText: { flex: 1, fontSize: 14, fontWeight: '700' },
    fieldRow: { flexDirection: 'row', gap: 12 },
    totalPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, marginTop: 18, paddingTop: 14 },
    totalPreviewLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    totalPreviewValue: { fontSize: 22, fontWeight: '900' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 13 },
    modalBtnText: { fontSize: 14, fontWeight: '800' },
});
