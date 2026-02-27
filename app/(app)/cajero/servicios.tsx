import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { PremiumAlert } from '../../../components/PremiumAlert';
import { EditServiceModal } from '../../../components/cajero/forms/EditServiceModal';
import { calculateRemainingTime, Timer, useTimer } from '../../../context/TimerContext';

const { width } = Dimensions.get('window');

// --- COMPONENTE DE TARJETA CON TIEMPO REAL ---
const ServiceCard = memo(({
    item,
    activeTab,
    serverOffset,
    onFinalizar,
    onEditar,
    theme,
    isDark
}: {
    item: Timer & {
        waiter_name?: string;
        habitacion_comision?: number;
        anfitrionas_ids?: number[];
        created_at?: string;
        estado?: number;
    },
    activeTab: string,
    serverOffset: number,
    onFinalizar: (t: Timer) => void,
    onEditar?: (t: Timer) => void,
    theme: any,
    isDark: boolean
}) => {
    const [remaining, setRemaining] = useState(calculateRemainingTime(item, serverOffset));

    useEffect(() => {
        if (!item.isActive || item.isPaused) return;
        const interval = setInterval(() => {
            setRemaining(calculateRemainingTime(item, serverOffset));
        }, 1000);
        return () => clearInterval(interval);
    }, [item, serverOffset]);

    const formatTime = (secs: number) => {
        const absSecs = Math.max(0, Math.abs(secs));
        const m = Math.floor(absSecs / 60);
        const s = absSecs % 60;
        return `${secs < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
    };

    const isCritical = remaining < 60 && remaining > 0;
    const isOverdue = remaining <= 0;
    const safePrice = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
        return 0;
    };

    const pServicio = safePrice(item.precio_servicio);
    const pHabitacion = safePrice(item.precio_habitacion);
    const iva = safePrice(item.iva);
    const total = safePrice(item.total);

    // Formateo de fecha
    const dateObj = item.created_at ? new Date(item.created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const hostesses = item.anfitrionas ? item.anfitrionas.split(',').map(h => h.trim()) : [];

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: isOverdue ? theme.danger : theme.border }]}>
            {/* Header: Habitación y Estado */}
            <View style={styles.cardHeader}>
                <View style={styles.roomBadge}>
                    <View style={[styles.iconBox, { backgroundColor: theme.accent + '15' }]}>
                        <Ionicons name="bed" size={18} color={theme.accent} />
                    </View>
                    <View>
                        <Text style={[styles.roomName, { color: theme.text }]}>{item.roomName || 'Habitación'}</Text>
                        <Text style={[styles.serviceCode, { color: theme.textMuted }]}>#{item.servicioCode || 'S/N'}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, {
                    backgroundColor: item.estado === 0 ? theme.danger + '20' :
                        item.estado === 3 ? theme.warning + '20' :
                            item.estado === 4 ? theme.info + '20' :
                                activeTab === 'finalizados' ? theme.info + '10' :
                                    (isOverdue ? theme.danger + '10' : theme.success + '10')
                }]}>
                    <View style={[styles.statusDot, {
                        backgroundColor: item.estado === 0 ? theme.danger :
                            item.estado === 3 ? theme.warning :
                                item.estado === 4 ? theme.info :
                                    activeTab === 'finalizados' ? theme.info :
                                        (isOverdue ? theme.danger : theme.success)
                    }]} />
                    <Text style={[styles.statusLabel, {
                        color: item.estado === 0 ? theme.danger :
                            item.estado === 3 ? theme.warning :
                                item.estado === 4 ? theme.info :
                                    activeTab === 'finalizados' ? theme.info :
                                        (isOverdue ? theme.danger : theme.success)
                    }]}>
                        {item.estado === 0 ? 'ANULADO' :
                            item.estado === 3 ? 'PAUSADO' :
                                item.estado === 4 ? 'SOLICITUD ANUL.' :
                                    activeTab === 'finalizados' ? 'FINALIZADO' :
                                        (isOverdue ? 'TIEMPO AGOTADO' : 'EN PROCESO')}
                    </Text>
                </View>
            </View>

            {/* Temporizador Hero */}
            {activeTab === 'activos' && (
                <View style={[styles.timerHero, { backgroundColor: isOverdue ? theme.danger + '15' : (isCritical ? theme.warning + '15' : theme.bg) }]}>
                    <View style={styles.timerMeta}>
                        <Ionicons name="time" size={24} color={isOverdue ? theme.danger : (isCritical ? theme.warning : theme.accent)} />
                        <View>
                            <Text style={[styles.timerLabel, { color: theme.textMuted }]}>TIEMPO RESTANTE</Text>
                            <Text style={[styles.timerValue, { color: isOverdue ? theme.danger : theme.text }]}>{formatTime(remaining)}</Text>
                        </View>
                    </View>
                    {isOverdue && <Ionicons name="alert-circle" size={32} color={theme.danger} />}
                </View>
            )}

            {/* Información Operativa */}
            <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>CLIENTE</Text>
                    <View style={styles.valueGroup}>
                        <Ionicons name="person" size={14} color={theme.info} />
                        <View style={{ flex: 1 }}>
                            {item.clienteNombre && item.clienteNombre !== 'Sin cliente' && item.clienteNombre !== 'Sin cliente registrado' ? (
                                (() => {
                                    const partes = item.clienteNombre.split(' ');
                                    const mitad = Math.ceil(partes.length / 2);
                                    const nombres = partes.slice(0, mitad).join(' ');
                                    const apellidos = partes.slice(mitad).join(' ');
                                    return (
                                        <>
                                            <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
                                                {nombres}
                                            </Text>
                                            {apellidos && (
                                                <Text style={[styles.clienteApellido, { color: theme.textMuted }]} numberOfLines={1}>
                                                    {apellidos}
                                                </Text>
                                            )}
                                        </>
                                    );
                                })()
                            ) : (
                                <Text style={[styles.value, { color: theme.textMuted }]}>{item.clienteNombre || 'Sin cliente'}</Text>
                            )}
                        </View>
                    </View>
                </View>
                <View style={[styles.infoCol, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 12 }]}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>ANFITRIONAS</Text>
                    <View style={styles.pillsRow}>
                        {hostesses.length > 0 ? hostesses.map((h, i) => (
                            <View key={i} style={[styles.pill, { backgroundColor: theme.accent }]}>
                                <Text style={styles.pillText}>{h}</Text>
                            </View>
                        )) : <Text style={[styles.value, { color: theme.textMuted }]}>Ninguna</Text>}
                    </View>
                </View>
            </View>

            {/* BOX FINANCIERO (Premium Detail) */}
            <View style={[styles.financeBox, { backgroundColor: isDark ? '#FFFFFF05' : '#F1F5F9' }]}>
                <View style={styles.financeGrid}>
                    <View style={styles.finItem}>
                        <Text style={[styles.finLabel, { color: theme.textMuted }]}>Servicio</Text>
                        <Text style={[styles.finValue, { color: theme.text }]}>${pServicio.toLocaleString()}</Text>
                    </View>
                    <View style={styles.finItem}>
                        <Text style={[styles.finLabel, { color: theme.textMuted }]}>Habitación</Text>
                        <Text style={[styles.finValue, { color: theme.text }]}>${pHabitacion.toLocaleString()}</Text>
                    </View>
                    <View style={styles.finItem}>
                        <Text style={[styles.finLabel, { color: theme.textMuted }]}>IVA</Text>
                        <Text style={[styles.finValue, { color: theme.accent }]}>${iva.toLocaleString()}</Text>
                    </View>
                </View>

                <View style={[styles.finDivider, { backgroundColor: theme.border }]} />

                <View style={styles.totalRow}>
                    <View>
                        <Text style={[styles.totalLabel, { color: theme.textMuted }]}>TOTAL</Text>
                        <View style={styles.methodTag}>
                            <Ionicons name="card" size={12} color={theme.textMuted} />
                            <Text style={[styles.methodText, { color: theme.textMuted }]}>{item.metodo_pago?.toUpperCase() || 'EFECTIVO'}</Text>
                        </View>
                    </View>
                    <Text style={[styles.totalPrice, { color: theme.text }]}>${total.toLocaleString()}</Text>
                </View>
            </View>

            {/* Footer Metadata */}
            <View style={styles.footer}>
                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>{dateStr} • {timeStr}</Text>
                    <Text style={[styles.metaText, { color: theme.textMuted }]}> • Creado por: </Text>
                    <Ionicons name="person-outline" size={12} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textMuted, fontWeight: '700' }]}>{item.waiter_name || 'Admin'}</Text>
                </View>
            </View>

            {/* Botones de Acción */}
            {activeTab === 'activos' && (
                <View style={styles.actionsBox}>
                    {(item.habitacion_comision ?? 0) > 0 && (item.precio_servicio ?? 0) === 0 && (
                        <Pressable
                            style={[styles.editActionBtn, { backgroundColor: theme.warning }]}
                            onPress={() => onEditar && onEditar(item)}
                        >
                            <Ionicons name="create" size={16} color="#FFF" />
                            <Text style={styles.finishBtnText}>EDITAR</Text>
                        </Pressable>
                    )}
                    <Pressable
                        style={[styles.finishActionBtn, { backgroundColor: theme.danger }]}
                        onPress={() => onFinalizar(item)}
                    >
                        <Ionicons name="stop" size={16} color="#FFF" />
                        <Text style={styles.finishBtnText}>FINALIZAR</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
});

export default function ServiciosActivosScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { timers, loading: loadingTimers, refreshTimers, serverOffset } = useTimer();
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'activos' | 'finalizados'>('activos');
    const [finalizados, setFinalizados] = useState<Timer[]>([]);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTimer, setSelectedTimer] = useState<Timer | null>(null);
    const [loadingFinalizados, setLoadingFinalizados] = useState(false);
    const dataRef = useRef<string>('');
    const timersRef = useRef<string>('');

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const theme = {
        bg: isDark ? '#000000' : '#F8FAFC',
        card: isDark ? '#111827' : '#FFFFFF',
        text: isDark ? '#F9FAFB' : '#0F172A',
        textMuted: isDark ? '#9CA3AF' : '#64748B',
        border: isDark ? '#1F2937' : '#E2E8F0',
        accent: '#8B5CF6',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    };

    const fetchFinalizados = async (isManual = false) => {
        setLoadingFinalizados(true);
        try {
            // Primero obtener la caja abierta
            const cajaRes = await apiClient('/cashregister/status');
            console.log('[Servicios] Respuesta caja:', JSON.stringify(cajaRes, null, 2));

            let cajaId = null;

            // Intentar diferentes estructuras de respuesta
            if (cajaRes.success && cajaRes.data?.hasOpenCaja) {
                cajaId = cajaRes.data?.cajaInfo?.id_caja || cajaRes.data?.openCaja?.id_caja || cajaRes.data?.caja?.id_caja;
            } else if (cajaRes.data?.id_caja) {
                cajaId = cajaRes.data.id_caja;
            } else if (cajaRes.id_caja) {
                cajaId = cajaRes.id_caja;
            }

            console.log('[Servicios] Caja ID extraído:', cajaId);
            console.log('[Servicios] Estructura completa cajaRes:', JSON.stringify(cajaRes, null, 2));

            if (!cajaId) {
                console.warn('[Servicios] No se pudo obtener ID de caja abierta');
                setFinalizados([]);
                setLoadingFinalizados(false);
                if (isManual) {
                    Toast.show({
                        type: 'info',
                        text1: 'Información',
                        text2: 'No hay caja abierta',
                        visibilityTime: 3000
                    });
                }
                return;
            }

            // Obtener servicios finalizados de la caja actual
            const res = await apiClient(`/servicios?all=true&caja_id=${cajaId}`);
            console.log('[Servicios] URL:', `/servicios?all=true&caja_id=${cajaId}`);
            console.log('[Servicios] Respuesta servicios:', JSON.stringify(res, null, 2));
            console.log('[Servicios] Servicios finalizados:', res.data?.length || 0);

            if (res.success && Array.isArray(res.data)) {
                const serialized = JSON.stringify(res.data);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;

                // Mapear el formato de /servicios al formato de Timer
                const mapped: Timer[] = res.data.map((s: any) => ({
                    id: s.id_servicio.toString(),
                    servicioId: s.id_servicio,
                    roomId: s.habitacion_id,
                    roomName: s.habitacion_numero || `Habitación ${s.habitacion_id}`,
                    duration: s.tiempo,
                    remainingTime: 0,
                    isActive: false,
                    isPaused: false,
                    startTime: new Date(s.fecha_crea),
                    servicioCode: s.codigo,
                    clienteNombre: s.cliente_nombre,
                    anfitrionas: s.anfitrionas_nombres,
                    precio_servicio: s.precio_servicio,
                    precio_habitacion: s.precio_habitacion,
                    iva: s.iva,
                    total: s.total,
                    metodo_pago: s.metodo_pago,
                    waiter_name: s.usuario_nick || s.creator_name || 'Admin',
                    created_at: s.fecha_crea,
                    habitacion_comision: s.habitacion_comision || 0,
                    estado: s.estado,
                }));
                setFinalizados(mapped);

                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 3000
                    });
                }
            }
        } catch (error) {
            console.error('[Servicios] Error fetching finished services:', error);
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar el historial',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoadingFinalizados(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'finalizados') {
            fetchFinalizados();
        }
    }, [activeTab]);

    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'activos') {
            const currentTimersStr = JSON.stringify(timers);
            await refreshTimers();
            const newTimersStr = JSON.stringify(timers);
            const hasChanges = currentTimersStr !== newTimersStr;

            Toast.show({
                type: hasChanges ? 'success' : 'info',
                text1: hasChanges ? 'Éxito' : 'Información',
                text2: hasChanges ? 'Temporizadores actualizados' : 'Sin cambios en los servicios activos',
                visibilityTime: 3000
            });
        } else {
            await fetchFinalizados(true);
        }
        setRefreshing(false);
    };

    const onFinalizar = useCallback((timer: Timer) => {
        router.push({
            pathname: '/cajero/finalizar-servicio' as any,
            params: {
                id: timer.servicioId,
                type: timer.tipoTransaccion || 'servicio'
            }
        });
    }, [router]);

    const onEditar = useCallback((timer: Timer) => {
        setSelectedTimer(timer);
        setEditModalVisible(true);
    }, []);

    const handleEditSuccess = () => {
        setEditModalVisible(false);
        setSelectedTimer(null);
        refreshTimers(); // Refresh active timers
        fetchFinalizados(); // Refresh finished timers in case it was a finished one being edited
        Toast.show({ type: 'success', text1: 'Servicio Actualizado', text2: 'Los detalles del servicio han sido modificados.' });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header Rediseñado */}
            <View style={[styles.header, { backgroundColor: theme.card, paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => router.replace('/cajero/(tabs)' as any)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </Pressable>
                    <View style={styles.titleArea}>
                        <View>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Servicios</Text>
                            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>Control de privados</Text>
                        </View>
                        <Pressable
                            onPress={() => router.push('/cajero/nuevo-servicio')}
                            style={[styles.plusBtn, { backgroundColor: theme.accent }]}
                        >
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.plusBtnText}>NUEVO</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Tabs Minimalistas */}
                <View style={styles.tabBar}>
                    <Pressable
                        style={[styles.tabBtn, activeTab === 'activos' && { borderBottomColor: theme.accent }]}
                        onPress={() => setActiveTab('activos')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'activos' ? theme.accent : theme.textMuted }]}>ACTIVOS</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tabBtn, activeTab === 'finalizados' && { borderBottomColor: theme.accent }]}
                        onPress={() => setActiveTab('finalizados')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'finalizados' ? theme.accent : theme.textMuted }]}>FINALIZADOS</Text>
                    </Pressable>
                </View>
            </View>

            {(loadingTimers || (activeTab === 'finalizados' && loadingFinalizados)) ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'activos'
                        ? timers.filter(t => t.tipoTransaccion === 'servicio' && t.isActive)
                        : finalizados
                    }
                    renderItem={({ item }) => (
                        <ServiceCard
                            item={item}
                            activeTab={activeTab}
                            serverOffset={serverOffset}
                            onFinalizar={onFinalizar}
                            onEditar={onEditar}
                            theme={theme}
                            isDark={isDark}
                        />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="calendar-outline" size={60} color={theme.textMuted} style={{ opacity: 0.2 }} />
                            <Text style={[styles.emptyText, { color: theme.text }]}>No hay servicios</Text>
                            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                                {activeTab === 'activos' ? 'Los privados activos aparecerán aquí.' : 'No tienes servicios finalizados todavía.'}
                            </Text>
                        </View>
                    }
                />
            )}

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
                onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                showCancel
            />

            {selectedTimer && (
                <EditServiceModal
                    visible={editModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    onSuccess={handleEditSuccess}
                    timer={selectedTimer}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    titleArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontWeight: '600' },
    plusBtn: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    plusBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    tabBar: { flexDirection: 'row', marginTop: 20 },
    tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    list: { padding: 20, paddingBottom: 100 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Card Interior
    card: { borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    roomBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    roomName: { fontSize: 18, fontWeight: '900' },
    serviceCode: { fontSize: 11, fontWeight: '700', marginTop: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, gap: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    timerHero: { padding: 14, borderRadius: 20, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    timerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    timerValue: { fontSize: 28, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace' },

    infoGrid: { flexDirection: 'row', marginBottom: 14 },
    infoCol: { flex: 1 },
    label: { fontSize: 9, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
    valueGroup: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
    value: { fontSize: 13, fontWeight: '800' },
    clienteApellido: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    pillText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

    financeBox: { borderRadius: 20, padding: 14, marginBottom: 12 },
    financeGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    finItem: { flex: 1 },
    finLabel: { fontSize: 9, fontWeight: '700', marginBottom: 2 },
    finValue: { fontSize: 13, fontWeight: '800' },
    finDivider: { height: 1, marginVertical: 10, opacity: 0.1 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    totalPrice: { fontSize: 24, fontWeight: '900' },
    methodTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    methodText: { fontSize: 9, fontWeight: '800' },

    footer: { flexDirection: 'column', paddingTop: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' },
    metaText: { fontSize: 10, fontWeight: '600' },
    actionsBox: { flexDirection: 'row', gap: 8, width: '100%' },
    circleBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    finishActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, elevation: 2 },
    editActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, elevation: 2 },
    finishBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900', marginLeft: 6 },

    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: '900', marginTop: 20 },
    emptySub: { fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});
