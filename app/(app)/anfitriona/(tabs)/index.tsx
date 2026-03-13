import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    Text as RNText,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventSource from 'react-native-sse';
import Toast from 'react-native-toast-message';
import { API_URL, apiClient } from '../../../../api/client';
import { AnimatedButton } from '../../../../components/AnimatedButton';
import { AnimatedScreen } from '../../../../components/AnimatedScreen';
import { DonutChart } from '../../../../components/DonutChart';
import { PremiumAlert } from '../../../../components/PremiumAlert';
import { PremiumCalendar } from '../../../../components/PremiumCalendar';
import { PremiumHeaderActions } from '../../../../components/PremiumHeaderActions';
import { PremiumLiquidationCard } from '../../../../components/PremiumLiquidationCard';
import { PremiumUserProfile } from '../../../../components/PremiumUserProfile';
import { SkeletonLoader } from '../../../../components/SkeletonLoader';
import { useAccentColor } from '../../../../hooks/useAccentColor';
import { useAuthStore } from '../../../../store/authStore';

const { width } = Dimensions.get('window');

type AnfitrionaState = {
    loading: boolean;
    refreshing: boolean;
    events: any[];
    stats: any;
    userStatus: number;
    hasNewAlert: boolean;
    selectedDates: string[];
    isModalVisible: boolean;
    alertConfig: {
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    };
    activeService: any | null;
};

type AnfitrionaAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_DATA'; payload: Partial<AnfitrionaState> }
    | { type: 'UPDATE_STATUS'; payload: number }
    | { type: 'SET_NEW_ALERT'; payload: boolean }
    | { type: 'UPDATE_SELECTED_DATES'; payload: string[] }
    | { type: 'SET_MODAL_VISIBLE'; payload: boolean }
    | { type: 'SET_ALERT'; payload: AnfitrionaState['alertConfig'] };

const initialAnfitrionaState: AnfitrionaState = {
    loading: true,
    refreshing: false,
    events: [],
    stats: { weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 },
    userStatus: 1,
    hasNewAlert: false,
    selectedDates: [],
    isModalVisible: false,
    alertConfig: { visible: false, title: '', message: '', type: 'info' },
    activeService: null,
};

function anfitrionaReducer(state: AnfitrionaState, action: AnfitrionaAction): AnfitrionaState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_DATA': return { ...state, ...action.payload };
        case 'UPDATE_STATUS': return { ...state, userStatus: action.payload };
        case 'SET_NEW_ALERT': return { ...state, hasNewAlert: action.payload };
        case 'UPDATE_SELECTED_DATES': return { ...state, selectedDates: action.payload };
        case 'SET_MODAL_VISIBLE': return { ...state, isModalVisible: action.payload };
        case 'SET_ALERT': return { ...state, alertConfig: action.payload };
        default: return state;
    }
}

const DashboardSkeleton = ({ bg, insets, width, styles }: any) => (
    <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={[styles.header, { paddingTop: insets.top + 10, height: 260 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <SkeletonLoader width={40} height={40} borderRadius={20} />
                <SkeletonLoader width={40} height={40} borderRadius={20} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <SkeletonLoader width={70} height={70} borderRadius={35} />
                <View style={{ gap: 8 }}>
                    <SkeletonLoader width={150} height={20} />
                    <SkeletonLoader width={100} height={15} />
                </View>
            </View>
            <SkeletonLoader width="100%" height={50} borderRadius={25} style={{ marginTop: 25 }} />
        </View>
        <View style={styles.analyticsRow}>
            <SkeletonLoader width={(width - 44) / 2} height={140} borderRadius={24} />
            <SkeletonLoader width={(width - 44) / 2} height={140} borderRadius={24} />
        </View>
        <View style={{ padding: 16 }}>
            <SkeletonLoader width="100%" height={280} borderRadius={24} />
        </View>
    </View>
);

export default function AnfitrionaHomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const insets = useSafeAreaInsets();
    const dataRef = useRef<string>('');

    const [state, dispatch] = useReducer(anfitrionaReducer, initialAnfitrionaState);
    const {
        loading, refreshing, events, stats, userStatus,
        hasNewAlert, selectedDates, isModalVisible, alertConfig, activeService
    } = state;

    const bg = isDark ? '#0F0D2E' : '#FFFFFF';
    const cardBg = isDark ? '#1E1B4B' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';

    const showAlert = useCallback((title: string, message: string, type: AnfitrionaState['alertConfig']['type'] = 'info', onConfirm?: () => void, showCancel = false) => {
        dispatch({ type: 'SET_ALERT', payload: { visible: true, title, message, type, onConfirm, showCancel } });
    }, []);

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const [eventsRes, statsRes, userRes, serviciosRes] = await Promise.all([
                apiClient('/events/user'),
                apiClient('/events/stats'),
                apiClient('/auth/me'),
                apiClient('/servicios/user')
            ]);

            const activeSvc = serviciosRes.success ? serviciosRes.data.find((s: any) => s.estado === 2) : null;

            const newData = { events: eventsRes.data, stats: statsRes.data, status: userRes.user?.status, activeService: activeSvc };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            dispatch({
                type: 'SET_DATA',
                payload: {
                    events: eventsRes.data || [],
                    stats: statsRes.data || initialAnfitrionaState.stats,
                    userStatus: userRes.user?.status || 1,
                    activeService: activeSvc
                }
            });

            if (userRes.success && userRes.user) {
                useAuthStore.getState().updateProfile(userRes.user);
            }

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            if (isManual) Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchData(true);
    }, [fetchData]);

    // Real-time updates via SSE
    useEffect(() => {
        if (!user?.id) return;

        const sseUrl = `${API_URL}/notifications/sse`;
        let es: EventSource | null = null;

        try {
            es = new EventSource(sseUrl);

            es.addEventListener('message', (event: any) => {
                if (!event.data) return;
                try {
                    const payload = JSON.parse(event.data);

                    if (['user_status_updated', 'timer_started', 'timer_stopped', 'timer_paused', 'timer_resumed', 'service_created', 'venta_created'].includes(payload.type)) {
                        console.log(`[AnfitrionaHome] Event ${payload.type} received, refreshing dashboard`);
                        fetchData();
                    }
                } catch (err) {
                    console.error('[AnfitrionaHome] SSE parse error:', err);
                }
            });
        } catch (err) {
            console.warn('[AnfitrionaHome] SSE init error:', err);
        }

        return () => {
            if (es) es.close();
        };
    }, [user?.id, fetchData]);


    const dailyGrowth = useMemo(() => {
        if (!stats?.weeklyIncome || stats.weeklyIncome.length < 2) return 0;
        const sorted = [...stats.weeklyIncome].sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());
        const today = sorted[0]?.total || 0;
        const yesterday = sorted[1]?.total || 1;
        return Math.round(((today - yesterday) / yesterday) * 100);
    }, [stats]);

    const selectedEvents = useMemo(() => {
        if (selectedDates.length === 0) return [];
        return events.filter(e => {
            const d = new Date(e.date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return selectedDates.includes(dateStr);
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDates, events]);


    const handleAssistance = async (type: string) => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const res = await apiClient('/notifications/assistance', {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    message: `Solicitud de ${type} en habitación ${activeService?.habitacion}`,
                    servicioId: activeService?.id_servicio,
                    roomName: activeService?.habitacion
                })
            });
            if (res.success) {
                Toast.show({ type: 'success', text1: 'Solicitud enviada', text2: `${type} notificado con éxito` });
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar la solicitud' });
        }
    };

    if (loading) return <DashboardSkeleton bg={bg} insets={insets} width={width} styles={styles} />;

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <AnimatedScreen>
                    <LinearGradient
                        colors={gradientColors as any}
                        style={[styles.header, { paddingTop: insets.top + 10 }]}
                    >
                        <PremiumHeaderActions
                            hasNewAlert={hasNewAlert}
                            setHasNewAlert={(val) => dispatch({ type: 'SET_NEW_ALERT', payload: val })}
                            showAlert={showAlert}
                            profilePath="/anfitriona/perfil"
                            showNotifications={false}
                        />
                        <PremiumUserProfile user={user} userStatus={userStatus} />

                        <AnimatePresence>
                            {!activeService && (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    style={styles.callStaffContainer}
                                >
                                    <AnimatedButton
                                        style={[styles.callStaffBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            showAlert(
                                                'Solicitud de Personal',
                                                '¿Deseas enviar una notificación de llamado a los garzones y cajera?',
                                                'warning',
                                                async () => {
                                                    try {
                                                        const res = await apiClient('/notifications/assistance', {
                                                            method: 'POST',
                                                            body: JSON.stringify({
                                                                type: 'Llamado General',
                                                                message: 'Anfitriona solicita atención',
                                                                servicioId: activeService?.id_servicio,
                                                                roomName: activeService?.habitacion
                                                            })
                                                        });
                                                        if (res.success) {
                                                            Toast.show({ type: 'success', text1: 'Llamado enviado', text2: `Personal notificado ${activeService ? `en Hab. ${activeService.habitacion}` : ''}` });
                                                        }
                                                    } catch (err) {
                                                        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el llamado' });
                                                    }
                                                },
                                                true
                                            );
                                        }}
                                    >
                                        <Ionicons name="notifications" size={18} color="#FFFFFF" />
                                        <RNText style={styles.callStaffBtnText}>SOLICITAR PERSONAL</RNText>
                                    </AnimatedButton>
                                </MotiView>
                            )}
                        </AnimatePresence>
                    </LinearGradient>

                    <AnimatePresence>
                        {activeService && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.9, translateY: -20 }}
                                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                exit={{ opacity: 0, scale: 0.9, translateY: -20 }}
                                style={[styles.activeServiceCard, { shadowColor: accentColor }]}
                            >
                                <LinearGradient
                                    colors={[accentColor, `${accentColor}88`]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.activeServiceGradient}
                                >
                                    <View style={styles.activeServiceHeader}>
                                        <View>
                                            <RNText style={styles.activeServiceLabel}>SERVICIO EN CURSO</RNText>
                                            <RNText style={styles.activeServiceRoom}>HABITACIÓN {activeService.habitacion}</RNText>
                                        </View>
                                        <View style={styles.activeServiceTimer}>
                                            <Ionicons name="time" size={20} color="#FFFFFF" />
                                            <RNText style={styles.activeServiceStatus}>ACTIVO</RNText>
                                        </View>
                                    </View>

                                    <View style={styles.activeServiceActions}>
                                        <Pressable style={styles.actionIconButton} onPress={() => handleAssistance('Tragos')}>
                                            <Ionicons name="beer" size={20} color="#FFFFFF" />
                                            <RNText style={styles.actionIconText}>Tragos</RNText>
                                        </Pressable>
                                        <Pressable style={styles.actionIconButton} onPress={() => handleAssistance('Limpieza')}>
                                            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                                            <RNText style={styles.actionIconText}>Limpieza</RNText>
                                        </Pressable>
                                        <Pressable style={styles.actionIconButton} onPress={() => handleAssistance('Seguridad')}>
                                            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                                            <RNText style={styles.actionIconText}>Alerta</RNText>
                                        </Pressable>
                                    </View>
                                </LinearGradient>
                            </MotiView>
                        )}
                    </AnimatePresence>


                    <View style={styles.analyticsRow}>
                        <MotiView
                            from={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', delay: 100 }}
                            style={[styles.glassCard, { flex: 1, backgroundColor: cardBg, borderColor }]}
                        >
                            <Pressable
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    const missing = 50000 - (stats?.totalEarnings || 0);
                                    const daysLeft = 7 - new Date().getDay();
                                    const dailyNeeded = missing > 0 ? Math.round(missing / Math.max(1, daysLeft)) : 0;

                                    showAlert(
                                        'Proyección de Meta',
                                        missing > 0
                                            ? `Te faltan $${missing.toLocaleString()} para tu meta. Necesitas aprox. $${dailyNeeded.toLocaleString()} por día.`
                                            : '¡Felicidades! Has superado tu meta semanal.',
                                        'info'
                                    );
                                }}
                            >
                                <View style={styles.cardHeader}>
                                    <RNText style={[styles.cardTitle, { color: textPrimary }]}>Meta Semanal</RNText>
                                    <Ionicons name="flag" size={14} color="#E11D48" />
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <DonutChart percent={Math.min(100, Math.round(((stats?.totalEarnings || 0) / 50000) * 100))} color={accentColor} isDark={isDark} size={70} strokeWidth={5} />
                                    <RNText style={[styles.goalStatus, { color: textSecondary }]}>${(stats?.totalEarnings || 0).toLocaleString()} <RNText style={{ opacity: 0.5 }}>/ $50k</RNText></RNText>
                                </View>
                            </Pressable>
                        </MotiView>
                        <MotiView
                            from={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', delay: 200 }}
                            style={[styles.glassCard, { flex: 1, backgroundColor: cardBg, borderColor }]}
                        >
                            <View style={styles.cardHeader}>
                                <RNText style={[styles.cardTitle, { color: textPrimary }]}>Crecimiento</RNText>
                                <Ionicons name="trending-up" size={14} color={dailyGrowth >= 0 ? '#10B981' : '#EF4444'} />
                            </View>
                            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <RNText style={[styles.bigStat, { color: dailyGrowth >= 0 ? '#10B981' : '#EF4444' }]}>{dailyGrowth >= 0 ? '+' : ''}{dailyGrowth}%</RNText>
                                <RNText style={[styles.statLabel, { color: textSecondary }]}>v/s ayer</RNText>
                            </View>
                        </MotiView>
                    </View>

                    <MotiView
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', delay: 300 }}
                    >
                        <PremiumCalendar
                            events={events}
                            selectedDates={selectedDates}
                            onDateToggle={(dateStr) => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const next = selectedDates.includes(dateStr) ? selectedDates.filter(d => d !== dateStr) : [...selectedDates, dateStr];
                                dispatch({ type: 'UPDATE_SELECTED_DATES', payload: next });
                            }}
                        />
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', delay: 400 }}
                    >
                        <PremiumLiquidationCard user={user} events={events} />
                    </MotiView>

                    <View style={{ height: 100 }} />
                </AnimatedScreen>
            </ScrollView>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } });
                    alertConfig.onConfirm?.();
                }}
                onCancel={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } });
                }}
                showCancel={alertConfig.showCancel}
            />

            {selectedDates.length > 0 && (
                <MotiView
                    from={{ translateY: 100, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    style={[styles.selectionFloat, { backgroundColor: isDark ? '#1F2937' : '#374151' }]}
                >
                    <RNText style={[styles.selectionText, { color: '#FFF' }]}>{selectedDates.length} días seleccionados</RNText>
                    <View style={styles.selectionActions}>
                        <Pressable
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                dispatch({ type: 'UPDATE_SELECTED_DATES', payload: [] });
                            }}
                            style={styles.clearBtn}
                        >
                            <RNText style={styles.clearBtnText}>Borrar</RNText>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                dispatch({ type: 'SET_MODAL_VISIBLE', payload: true });
                            }}
                            style={[styles.viewBtn, { backgroundColor: accentColor }]}
                        >
                            <RNText style={styles.viewBtnText}>Detalles</RNText>
                        </Pressable>
                    </View>
                </MotiView>
            )}

            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })}>
                <View style={styles.modalOverlayBottom}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <RNText style={[styles.modalTitle, { color: textPrimary }]}>Eventos Detallados</RNText>
                                <RNText style={[styles.modalSubtitle, { color: textSecondary }]}>{selectedDates.length} días seleccionados</RNText>
                            </View>
                            <Pressable style={[styles.closeBtn, { backgroundColor: cardBg }]} onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>
                        <FlatList
                            data={selectedEvents}
                            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
                            renderItem={({ item }) => {
                                const isAnticipo = item.type === 'anticipo';
                                const iconName = item.type === 'venta' ? 'cart' :
                                    item.type === 'propina' ? 'heart' :
                                        item.type === 'comision' ? 'star' :
                                            item.type === 'servicio' ? 'time' : 'cash';
                                const iconColor = isAnticipo ? '#EF4444' : '#10B981';

                                return (
                                    <View style={[styles.eventItem, { backgroundColor: cardBg, borderColor }]}>
                                        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                                            <Ionicons name={iconName as any} size={18} color={iconColor} />
                                        </View>
                                        <View style={styles.eventInfo}>
                                            <RNText style={[styles.eventTitle, { color: textPrimary }]}>
                                                {item.type.toUpperCase()} {item.codigo || `#${item.id}`}
                                            </RNText>
                                            <RNText style={[styles.eventTime, { color: textSecondary }]}>
                                                {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </RNText>
                                        </View>
                                        <RNText style={[styles.eventPrice, { color: isAnticipo ? '#EF4444' : '#10B981' }]}>
                                            {isAnticipo ? '-' : '+'}${item.amount.toLocaleString()}
                                        </RNText>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 10, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    glassCard: { borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    analyticsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 10 },
    bigStat: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    statLabel: { fontSize: 11, fontWeight: '600' },
    goalStatus: { textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: 8 },
    callStaffContainer: { marginTop: 15, alignItems: 'center' },
    callStaffBtn: {
        paddingHorizontal: 25,
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 10,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    callStaffBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    activeServiceCard: {
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        marginBottom: 20
    },
    activeServiceGradient: {
        padding: 20,
    },
    activeServiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    activeServiceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2
    },
    activeServiceRoom: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        marginTop: 2
    },
    activeServiceTimer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    activeServiceStatus: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    activeServiceActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10
    },
    actionIconButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4
    },
    actionIconText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800'
    },
    selectionFloat: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10
    },
    selectionText: { fontSize: 13, fontWeight: '700' },
    selectionActions: { flexDirection: 'row', gap: 10 },
    clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    clearBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
    viewBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    viewBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '80%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    modalHeader: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#37415120' },
    modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    modalSubtitle: { fontSize: 14, marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    eventItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    eventInfo: { flex: 1, marginLeft: 15 },
    eventTitle: { fontSize: 14, fontWeight: '700' },
    eventTime: { fontSize: 12, marginTop: 2 },
    eventPrice: { fontSize: 16, fontWeight: '800' },
});
