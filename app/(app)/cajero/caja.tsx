import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
    Animated,
    DeviceEventEmitter,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useAuthStore } from '../../../store/authStore';
import { Skeleton } from '../../../components/ui/Skeleton';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type CajaState = {
    loading: boolean;
    refreshing: boolean;
    cajaAbierta: boolean;
    cajaInfo: any;
    stats: any;
    modalVisible: boolean;
    modalType: 'abrir' | 'cerrar' | 'retiro';
    monto: string;
    motivoRetiro: string;
    submitting: boolean;
};

type CajaAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_CAJA_STATUS'; payload: { abierta: boolean; info: any } }
    | { type: 'SET_STATS'; payload: any }
    | { type: 'OPEN_MODAL'; payload: 'abrir' | 'cerrar' | 'retiro' }
    | { type: 'CLOSE_MODAL' }
    | { type: 'SET_MONTO'; payload: string }
    | { type: 'SET_MOTIVO'; payload: string }
    | { type: 'SET_SUBMITTING'; payload: boolean };

const initialCajaState: CajaState = {
    loading: true,
    refreshing: false,
    cajaAbierta: false,
    cajaInfo: null,
    stats: null,
    modalVisible: false,
    modalType: 'abrir',
    monto: '',
    motivoRetiro: '',
    submitting: false,
};

function cajaReducer(state: CajaState, action: CajaAction): CajaState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_CAJA_STATUS': return { ...state, cajaAbierta: action.payload.abierta, cajaInfo: action.payload.info };
        case 'SET_STATS': return { ...state, stats: action.payload };
        case 'OPEN_MODAL': return { ...state, modalVisible: true, modalType: action.payload, monto: '', motivoRetiro: '' };
        case 'CLOSE_MODAL': return { ...state, modalVisible: false };
        case 'SET_MONTO': return { ...state, monto: action.payload };
        case 'SET_MOTIVO': return { ...state, motivoRetiro: action.payload };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    Toast.show({ type, text1: title, text2: message, visibilityTime: 4000 });
};

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CajaSkeleton = ({ cardBg, borderColor }: { isDark: boolean, cardBg: string, borderColor: string }) => (
    <View style={{ gap: 16, padding: 16 }}>
        {/* Status card skeleton */}
        <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, padding: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton width={130} height={32} borderRadius={20} />
                <Skeleton width={90} height={36} borderRadius={12} />
            </View>
            <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 16 }} />
            <Skeleton width={200} height={14} borderRadius={8} />
        </View>
        {/* Metrics 2-col */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, flex: 1, padding: 16 }]}>
                <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 12 }} />
                <Skeleton width={60} height={10} borderRadius={6} />
                <Skeleton width={90} height={26} borderRadius={8} style={{ marginTop: 8 }} />
            </View>
            <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, flex: 1, padding: 16 }]}>
                <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 12 }} />
                <Skeleton width={60} height={10} borderRadius={6} />
                <Skeleton width={90} height={26} borderRadius={8} style={{ marginTop: 8 }} />
            </View>
        </View>
        {/* Breakdown list */}
        <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, gap: 16, padding: 20 }]}>
            <Skeleton width={140} height={14} borderRadius={8} />
            {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={110} height={12} borderRadius={6} />
                    <Skeleton width={70} height={12} borderRadius={6} />
                </View>
            ))}
        </View>
    </View>
);

// â”€â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MetricCard = ({
    label, value, icon, color, bgColor, isDark, cardBg, borderColor
}: {
    label: string; value: number; icon: any; color: string; bgColor: string;
    isDark: boolean; cardBg: string; borderColor: string;
}) => (
    <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={[styles.metricIconBox, { backgroundColor: bgColor }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.metricLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            ${value.toLocaleString()}
        </Text>
    </View>
);

// â”€â”€â”€ Row Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatRow = ({ label, value, accent, textPrimary, textSecondary, borderColor }: {
    label: string; value: number; accent?: string;
    textPrimary: string; textSecondary: string; borderColor: string;
}) => (
    <View style={[styles.statRow, { borderBottomColor: borderColor }]}>
        <Text style={[styles.statRowLabel, { color: textSecondary }]}>{label}</Text>
        <Text style={[styles.statRowValue, { color: accent ?? textPrimary }]}>
            ${value.toLocaleString()}
        </Text>
    </View>
);

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CajaScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(state => state.user);

    const [state, dispatch] = useReducer(cajaReducer, initialCajaState);
    const { loading, refreshing, cajaAbierta, cajaInfo, stats, modalVisible, modalType, monto, motivoRetiro, submitting } = state;
    const dataRef = useRef<string>('');

    const bg = isDark ? '#000000' : '#F1F5F9';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? `${accentColor}40` : '#E2E8F0';
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const fetchData = useCallback(async (isManual = false) => {
        if (!isManual) dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const [statusRes, statsRes] = await Promise.all([
                apiClient('/cashregister/status').catch(() => ({ success: false, data: null })),
                apiClient('/cashregister?resumen=1').catch(() => null)
            ]);

            const newData = { status: statusRes?.data, stats: statsRes?.data };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (statusRes.success && statusRes.data) {
                dispatch({ type: 'SET_CAJA_STATUS', payload: { abierta: statusRes.data.hasOpenCaja, info: statusRes.data.cajaInfo } });
            } else {
                dispatch({ type: 'SET_CAJA_STATUS', payload: { abierta: false, info: null } });
            }

            if (statsRes && statsRes.success && statsRes.data) {
                dispatch({ type: 'SET_STATS', payload: statsRes.data });
            }

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Actualizado' : 'Sin cambios',
                    text2: hasChanges ? 'Datos de caja actualizados' : 'Los datos no han cambiado',
                    visibilityTime: 2500
                });
            }
        } catch {
            if (isManual) showToast('Error', 'No se pudo actualizar la informaciÃ³n');
            else showToast('Error', 'No se pudo cargar la informaciÃ³n de la caja');
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, [user?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchData(true);
    }, [fetchData]);

    const handleMontoChange = (text: string) => {
        const clean = text.replace(/\D/g, '');
        const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        dispatch({ type: 'SET_MONTO', payload: formatted });
    };

    const handleSubmit = async () => {
        let numericMonto = 0;
        if (modalType === 'cerrar') {
            numericMonto = stats?.balance_total || 0;
        } else {
            const cleanMonto = monto.replace(/\./g, '');
            if (!cleanMonto || isNaN(Number(cleanMonto))) { showToast('Error', 'Ingresa un monto vÃ¡lido'); return; }
            numericMonto = Number(cleanMonto);
        }

        if (numericMonto < 0) { showToast('Error', 'El monto no puede ser negativo'); return; }
        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            if (modalType === 'abrir') {
                const res = await apiClient('/cashregister', { method: 'POST', body: JSON.stringify({ monto_apertura: numericMonto, usuario_id_apertura: user?.id || 1 }) });
                if (res.success) {
                    showToast('Turno Iniciado', 'Caja abierta correctamente', 'success');
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    DeviceEventEmitter.emit('refresh_requests');
                }
                else showToast('Error', res.message || 'Error al abrir caja');
            } else if (modalType === 'retiro') {
                if (!motivoRetiro.trim()) { showToast('Error', 'Ingresa el motivo del retiro'); dispatch({ type: 'SET_SUBMITTING', payload: false }); return; }
                if (!cajaInfo?.id_caja) { showToast('Error', 'No se encontrÃ³ la caja'); dispatch({ type: 'SET_SUBMITTING', payload: false }); return; }
                const res = await apiClient('/cashregister/retiro', { method: 'POST', body: JSON.stringify({ id_caja: cajaInfo.id_caja, monto: numericMonto, motivo: motivoRetiro, usuario_id: user?.id || 1 }) });
                if (res.success) {
                    showToast('Retiro Exitoso', `$${numericMonto.toLocaleString()} retirado correctamente`, 'success');
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    DeviceEventEmitter.emit('refresh_requests');
                }
                else showToast('Error', res.message || 'Error al retirar efectivo');
            } else {
                if (!cajaInfo?.id_caja) { showToast('Error', 'No se encontrÃ³ la caja a cerrar'); dispatch({ type: 'SET_SUBMITTING', payload: false }); return; }
                const res = await apiClient('/cashregister', { method: 'PATCH', body: JSON.stringify({ id_caja: cajaInfo.id_caja, monto_cierre: numericMonto, usuario_id_cierre: user?.id || 1 }) });
                if (res.success) {
                    showToast('Turno Cerrado', 'Caja cerrada correctamente', 'success');
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    DeviceEventEmitter.emit('refresh_requests');
                }
                else showToast('Error', res.message || 'Error al cerrar caja');
            }
        } catch (e: any) {
            showToast('Error', e.message || `Error al ${modalType} caja`);
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    };

    const modalConfig = {
        abrir: { title: 'Apertura de Turno', subtitle: 'Ingresa el monto base para iniciar el turno', icon: 'wallet-outline', color: '#10B981', btnText: 'Abrir Caja' },
        retiro: { title: 'Retirar Efectivo', subtitle: 'Ingresa el monto a retirar de la caja', icon: 'cash-outline', color: '#F59E0B', btnText: 'Realizar Retiro' },
        cerrar: { title: 'Cierre de Turno', subtitle: 'Confirma el cierre con el monto total calculado', icon: 'lock-closed-outline', color: '#EF4444', btnText: 'Cerrar Caja' },
    }[modalType];

    const headerTextColor = isDark ? '#111827' : '#FFFFFF';
    const headerSubColor = isDark ? '#4B5563' : 'rgba(255,255,255,0.8)';

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'dark' : 'light'} />

            {/* â”€â”€ Header â”€â”€ */}
            <LinearGradient
                colors={gradientColors as any}
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + (isTablet ? 20 : 10),
                        paddingBottom: 25,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                    },
                ]}
            >
                <View style={styles.headerTop}>
                    <Pressable
                        onPress={() => router.replace('/cajero/(tabs)' as any)}
                        style={styles.backBtn}
                        accessibilityLabel="Volver"
                    >
                        <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color={headerTextColor} />
                    </Pressable>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 10 }}>
                        <View>
                            <Text style={[styles.headerTitle, { color: headerTextColor }, isTablet && { fontSize: 28 }]}>
                                Caja
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: headerSubColor }, isTablet && { fontSize: 17 }]}>
                                {cajaAbierta && cajaInfo?.fecha_apertura
                                    ? `Abierta: ${new Date(cajaInfo.fecha_apertura).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`
                                    : 'Turno no iniciado'}
                            </Text>
                        </View>
                        <Pressable
                            style={styles.backBtn}
                            onPress={onRefresh}
                            accessibilityLabel="Actualizar caja"
                        >
                            <Ionicons name="refresh-outline" size={isTablet ? 26 : 22} color={headerTextColor} />
                        </Pressable>
                    </View>
                </View>
            </LinearGradient>

            {loading ? (
                <ScrollView style={{ flex: 1 }}>
                    <CajaSkeleton isDark={isDark} cardBg={cardBg} borderColor={borderColor} />
                </ScrollView>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* â”€â”€ Status Card â”€â”€ */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statusRow}>
                            {/* Status Pill */}
                            <View style={[styles.statusPill, { backgroundColor: cajaAbierta ? '#10B98118' : '#EF444418' }]}>
                                <View style={[styles.statusDot, { backgroundColor: cajaAbierta ? '#10B981' : '#EF4444' }]} />
                                <Text style={[styles.statusLabel, { color: cajaAbierta ? '#10B981' : '#EF4444' }]}>
                                    {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                                </Text>
                            </View>
                            {/* Action Buttons */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {cajaAbierta ? (
                                    <>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'retiro' })}
                                            accessibilityLabel="Retirar efectivo"
                                        >
                                            <Ionicons name="arrow-down-circle-outline" size={15} color="#F59E0B" />
                                            <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Retiro</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' })}
                                            accessibilityLabel="Cerrar caja"
                                        >
                                            <Ionicons name="lock-closed-outline" size={15} color="#EF4444" />
                                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cerrar</Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <Pressable
                                        style={[styles.actionBtn, { backgroundColor: `20`, borderColor: `40` }]}
                                        onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                                        accessibilityLabel="Abrir caja"
                                    >
                                        <Ionicons name="power-outline" size={15} color="#10B981" />
                                        <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Abrir Caja</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {cajaAbierta && cajaInfo && (
                            <View style={[styles.openedInfo, { borderTopColor: borderColor }]}>
                                <Ionicons name="time-outline" size={13} color={textSecondary} />
                                <Text style={[styles.openedText, { color: textSecondary }]}>
                                    Apertura: {new Date(cajaInfo.fecha_apertura).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                </Text>
                            </View>
                        )}
                    </View>

                    {cajaAbierta && stats && (
                        <>
                            {/* â”€â”€ 2-col Metric Cards â”€â”€ */}
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Balance Total" value={stats.balance_total || 0}
                                    icon="trending-up-outline" color={accentColor} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Efectivo en Caja" value={stats.total_efectivo || 0}
                                    icon="cash-outline" color="#10B981" bgColor="#10B98118"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Comisiones" value={stats.total_comisiones || 0}
                                    icon="people-outline" color="#8B5CF6" bgColor="#8B5CF618"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Propinas" value={stats.total_propina || 0}
                                    icon="heart-outline" color="#F59E0B" bgColor="#F59E0B18"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>

                            {/* â”€â”€ Breakdown Card â”€â”€ */}
                            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                <View style={styles.breakdownHeader}>
                                    <Ionicons name="bar-chart-outline" size={16} color={accentColor} />
                                    <Text style={[styles.breakdownTitle, { color: textPrimary }]}>Desglose del Turno</Text>
                                </View>

                                <StatRow label="Ventas" value={stats.total_ventas || 0} accent="#10B981" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Tarjetas" value={stats.total_tarjeta || 0} accent="#3B82F6" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Transferencias" value={stats.total_transferencia || 0} accent="#6366F1" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Servicios" value={stats.total_servicios || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="IVA" value={stats.total_iva || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Anticipos" value={stats.total_anticipo || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Devoluciones" value={stats.total_devoluciones || 0} accent="#EF4444" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />

                                {/* Divider + total */}
                                <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
                                    <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL INGRESADO</Text>
                                    <Text style={[styles.totalValue, { color: accentColor }]}>
                                        ${(stats.balance_total || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    {!cajaAbierta && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', paddingVertical: 40 }]}>
                            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#111111' : '#F1F5F9' }]}>
                                <Ionicons name="wallet-outline" size={36} color={textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Turno no iniciado</Text>
                            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                                Abre la caja para comenzar a registrar movimientos del turno
                            </Text>
                            <Pressable
                                style={[styles.emptyOpenBtn, { backgroundColor: accentColor }]}
                                onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                            >
                                <Ionicons name="power-outline" size={18} color="#FFF" />
                                <Text style={styles.emptyOpenBtnText}>Abrir Caja</Text>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* â”€â”€ Modal â”€â”€ */}
            <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => dispatch({ type: 'CLOSE_MODAL' })}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#111827' : '#FFF' }]}>
                        {/* Modal top accent bar */}
                        <View style={[styles.modalAccent, { backgroundColor: modalConfig.color }]} />

                        <View style={styles.modalBody}>
                            <View style={[styles.modalIconBox, { backgroundColor: `${modalConfig.color}20` }]}>
                                <Ionicons name={modalConfig.icon as any} size={32} color={modalConfig.color} />
                            </View>
                            <Text style={[styles.modalSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {modalConfig.subtitle}
                            </Text>

                            {/* Detalles del dinero al cerrar */}
                            {modalType === 'cerrar' && stats && (
                                <View style={[styles.modalBreakdown, { backgroundColor: isDark ? '#11111150' : '#F3F4F6', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Monto Apertura (Base)</Text>
                                        <Text style={[styles.breakdownItemValue, { color: textPrimary }]}>${(stats.monto_apertura || 0).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas Efectivo (Turno)</Text>
                                        <Text style={[styles.breakdownItemValue, { color: isDark ? '#10B981' : '#059669' }]}>${((stats.total_efectivo || 0) - (stats.monto_apertura || 0)).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas con Tarjeta</Text>
                                        <Text style={[styles.breakdownItemValue, { color: isDark ? '#3B82F6' : '#2563EB' }]}>${(stats.total_tarjeta || 0).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Transferencias</Text>
                                        <Text style={[styles.breakdownItemValue, { color: isDark ? '#8B5CF6' : '#7C3AED' }]}>${(stats.total_transferencia || 0).toLocaleString()}</Text>
                                    </View>
                                    {stats.total_devoluciones > 0 && (
                                        <View style={styles.breakdownItem}>
                                            <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Devoluciones</Text>
                                            <Text style={[styles.breakdownItemValue, { color: '#EF4444' }]}>-${(stats.total_devoluciones || 0).toLocaleString()}</Text>
                                        </View>
                                    )}
                                    <View style={[styles.breakdownItem, { borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', marginTop: 8, paddingTop: 8 }]}>
                                        <Text style={[styles.breakdownItemLabel, { color: textPrimary, fontWeight: '800' }]}>BALANCE TOTAL</Text>
                                        <Text style={[styles.breakdownItemValue, { color: '#E11D48', fontWeight: '900', fontSize: 20 }]}>${(stats.balance_total || 0).toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Monto Input / Info Box */}
                            {modalType === 'cerrar' ? (
                                <View style={[styles.inputBox, { borderColor: isDark ? '#374151' : '#E2E8F0', backgroundColor: isDark ? '#0D1117' : '#F8FAFC', justifyContent: 'center' }]}>
                                    <Text style={[styles.currencySign, { color: isDark ? '#F9FAFB' : '#111827' }]}>$</Text>
                                    <Text style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                                        {(stats?.balance_total || 0).toLocaleString()}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.inputBox, { borderColor: isDark ? '#374151' : '#E2E8F0', backgroundColor: isDark ? '#0D1117' : '#F8FAFC' }]}>
                                    <Text style={[styles.currencySign, { color: isDark ? '#F9FAFB' : '#111827' }]}>$</Text>
                                    <TextInput
                                        style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}
                                        value={monto}
                                        onChangeText={handleMontoChange}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={isDark ? '#4B5563' : '#CBD5E1'}
                                        autoFocus
                                    />
                                </View>
                            )}

                            {/* Motivo (retiro) */}
                            {modalType === 'retiro' && (
                                <View style={[styles.inputBox, { borderColor: isDark ? '#374151' : '#E2E8F0', backgroundColor: isDark ? '#0D1117' : '#F8FAFC', marginBottom: 0 }]}>
                                    <Ionicons name="document-text-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827', fontSize: 15 }]}
                                        value={motivoRetiro}
                                        onChangeText={val => dispatch({ type: 'SET_MOTIVO', payload: val })}
                                        placeholder="Motivo del retiro"
                                        placeholderTextColor={isDark ? '#4B5563' : '#CBD5E1'}
                                    />
                                </View>
                            )}

                            {/* Efectivo info box (solo retiro) */}
                            {modalType === 'retiro' && stats && (
                                <View style={[styles.infoBox, { backgroundColor: `${modalConfig.color}12`, marginTop: 16 }]}>
                                    <Ionicons name="information-circle-outline" size={18} color={modalConfig.color} />
                                    <Text style={{ color: modalConfig.color, fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                                        Efectivo disponible: ${(stats.total_efectivo || 0).toLocaleString()}
                                    </Text>
                                </View>
                            )}

                            {/* Actions */}
                            <View style={styles.modalActions}>
                                <Pressable
                                    style={[styles.modalBtn, { backgroundColor: isDark ? '#111111' : '#F1F5F9' }]}
                                    onPress={() => dispatch({ type: 'CLOSE_MODAL' })}
                                    disabled={submitting}
                                >
                                    <Text style={[styles.modalBtnCancel, { color: isDark ? '#9CA3AF' : '#475569' }]}>Cancelar</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.modalBtn, { backgroundColor: modalConfig.color, opacity: submitting ? 0.7 : 1 }]}
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                >
                                    <Text style={styles.modalBtnConfirm}>{submitting ? 'Procesando...' : modalConfig.btnText}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header â€” mismo patrÃ³n que cuentas/ventas/servicios
    header: { paddingHorizontal: 16 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 15, fontWeight: '500', opacity: 0.8 },

    // Scroll
    scroll: { padding: 16, gap: 12, paddingBottom: 40 },

    // Card
    card: { borderRadius: 20, borderWidth: 1, padding: 16 },
    skeletonCard: { borderRadius: 20, borderWidth: 1, padding: 16 },

    // Status
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: { fontSize: 13, fontWeight: '800' },
    openedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
    openedText: { fontSize: 12, fontWeight: '500' },

    // Action Buttons
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1
    },
    actionBtnText: { fontSize: 13, fontWeight: '700' },

    // Metrics Grid
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: {
        flex: 1, minWidth: '44%', borderRadius: 18, borderWidth: 1,
        padding: 14, gap: 4
    },
    metricIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    metricLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    metricValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

    // Breakdown
    breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    breakdownTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
    statRowLabel: { fontSize: 14, fontWeight: '500' },
    statRowValue: { fontSize: 15, fontWeight: '800' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 },
    totalLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
    totalValue: { fontSize: 22, fontWeight: '900', color: '#E11D48' },

    // Empty State
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginBottom: 24, maxWidth: 260, lineHeight: 20 },
    emptyOpenBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14
    },
    emptyOpenBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    modalAccent: { height: 4, width: '100%' },
    modalBody: { padding: 24, paddingBottom: 32 },
    modalIconBox: {
        width: 70, height: 70, borderRadius: 35,
        justifyContent: 'center', alignItems: 'center',
        alignSelf: 'center', marginBottom: 16
    },
    modalTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
    modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    inputBox: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16,
        marginBottom: 12, height: 58
    },
    currencySign: { fontSize: 26, fontWeight: '800', marginRight: 8 },
    input: { flex: 1, fontSize: 26, fontWeight: '800' },
    infoBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    modalBtn: { flex: 1, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalBtnCancel: { fontSize: 15, fontWeight: '700' },
    modalBtnConfirm: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    modalBreakdown: {
        width: '100%',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        gap: 8
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    breakdownItemLabel: {
        fontSize: 13,
        fontWeight: '600'
    },
    breakdownItemValue: {
        fontSize: 14,
        fontWeight: '700'
    },
});
