import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    Text as RNText,
    ScrollView,
    StyleSheet,
    useColorScheme,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function AnfitrionaHomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const insets = useSafeAreaInsets();
    const dataRef = useRef<string>('');

    const [state, dispatch] = useReducer(anfitrionaReducer, initialAnfitrionaState);
    const {
        loading, refreshing, events, stats, userStatus,
        hasNewAlert, selectedDates, isModalVisible, alertConfig, activeService
    } = state;

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

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

                    if (['user_status_updated', 'timer_started', 'timer_stopped', 'timer_paused', 'timer_resumed'].includes(payload.type)) {
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

    if (loading) return <View style={{ flex: 1, backgroundColor: bg, padding: 20 }}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
            >
                <AnimatedScreen>
                    <LinearGradient
                        colors={isDark ? ['#1E1B4B', '#000000'] : ['#F3F4F6', '#FFFFFF']}
                        style={[styles.header, { paddingTop: insets.top + 10 }]}
                    >
                        <PremiumHeaderActions
                            hasNewAlert={hasNewAlert}
                            setHasNewAlert={(val) => dispatch({ type: 'SET_NEW_ALERT', payload: val })}
                            showAlert={showAlert}
                            profilePath="/anfitriona/perfil"
                        />
                        <PremiumUserProfile user={user} userStatus={userStatus} />

                        <View style={styles.callStaffContainer}>
                            <AnimatedButton
                                style={styles.callStaffBtn}
                                onPress={() => {
                                    showAlert(
                                        'Llamar Staff',
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
                                <RNText style={styles.callStaffBtnText}>LLAMAR STAFF</RNText>
                            </AnimatedButton>
                            {activeService && (
                                <RNText style={{ color: '#F43F5E', fontSize: 11, fontWeight: '700', marginTop: 8 }}>
                                    Estas en Hab: {activeService.habitacion}
                                </RNText>
                            )}
                        </View>
                    </LinearGradient>


                    <View style={styles.analyticsRow}>
                        <View style={[styles.glassCard, { flex: 1, backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.cardHeader}>
                                <RNText style={[styles.cardTitle, { color: textPrimary }]}>Meta Semanal</RNText>
                                <Ionicons name="flag" size={14} color="#8B5CF6" />
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <DonutChart percent={Math.min(100, Math.round(((stats?.totalEarnings || 0) / 50000) * 100))} color="#8B5CF6" isDark={isDark} size={70} strokeWidth={5} />
                                <RNText style={[styles.goalStatus, { color: textSecondary }]}>${(stats?.totalEarnings || 0).toLocaleString()} <RNText style={{ opacity: 0.5 }}>/ $50k</RNText></RNText>
                            </View>
                        </View>
                        <View style={[styles.glassCard, { flex: 1, backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.cardHeader}>
                                <RNText style={[styles.cardTitle, { color: textPrimary }]}>Crecimiento</RNText>
                                <Ionicons name="trending-up" size={14} color={dailyGrowth >= 0 ? '#10B981' : '#EF4444'} />
                            </View>
                            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <RNText style={[styles.bigStat, { color: dailyGrowth >= 0 ? '#10B981' : '#EF4444' }]}>{dailyGrowth >= 0 ? '+' : ''}{dailyGrowth}%</RNText>
                                <RNText style={[styles.statLabel, { color: textSecondary }]}>v/s ayer</RNText>
                            </View>
                        </View>
                    </View>

                    <PremiumCalendar
                        events={events}
                        selectedDates={selectedDates}
                        onDateToggle={(dateStr) => {
                            const next = selectedDates.includes(dateStr) ? selectedDates.filter(d => d !== dateStr) : [...selectedDates, dateStr];
                            dispatch({ type: 'UPDATE_SELECTED_DATES', payload: next });
                        }}
                    />

                    <PremiumLiquidationCard user={user} events={events} />

                    <View style={{ height: 100 }} />
                </AnimatedScreen>
            </ScrollView>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={() => {
                    dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } });
                    alertConfig.onConfirm?.();
                }}
                onCancel={() => dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } })}
                showCancel={alertConfig.showCancel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 10, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    glassCard: { borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    analyticsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 10 },
    bigStat: { fontSize: 32, fontWeight: '900' },
    statLabel: { fontSize: 11, fontWeight: '600' },
    goalStatus: { textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: 8 },
    callStaffContainer: { marginTop: 15, alignItems: 'center' },
    callStaffBtn: {
        backgroundColor: '#F43F5E',
        paddingHorizontal: 25,
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 10,
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    callStaffBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});
