import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
    DeviceEventEmitter,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventSource from 'react-native-sse';
import Toast from 'react-native-toast-message';
import { API_URL, apiClient } from '../../../../api/client';
import { AnimatedScreen } from '../../../../components/AnimatedScreen';
import { CajeroActionGrid } from '../../../../components/CajeroActionGrid';
import { CajeroStats } from '../../../../components/CajeroStats';
import { PremiumAlert } from '../../../../components/PremiumAlert';
import { PremiumHeaderActions } from '../../../../components/PremiumHeaderActions';
import { PremiumLiquidationCard } from '../../../../components/PremiumLiquidationCard';
import { PremiumUserProfile } from '../../../../components/PremiumUserProfile';
import { SkeletonLoader } from '../../../../components/SkeletonLoader';
import { PendingSolicitudesAlert } from '../../../../components/PendingSolicitudesAlert';
import { useAccentColor } from '../../../../hooks/useAccentColor';
import { useAuthStore } from '../../../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Variable global para persistir el estado de carga inicial entre navegaciones
let initialLoadDone = false;

type CajeroState = {
    loading: boolean;
    refreshing: boolean;
    stats: any;
    events: any[];
    userStatus: number;
    hasNewAlert: boolean;
    pendingCount: number;
    alertConfig: {
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    };
};

type CajeroAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_DATA'; payload: Partial<CajeroState> }
    | { type: 'SET_NEW_ALERT'; payload: boolean }
    | { type: 'SET_ALERT'; payload: CajeroState['alertConfig'] };

const initialState: CajeroState = {
    loading: true, // Valor base, se sobreescribe en el componente
    refreshing: false,
    stats: null,
    events: [],
    userStatus: 1,
    hasNewAlert: false,
    pendingCount: 0,
    alertConfig: { visible: false, title: '', message: '', type: 'info' },
};

function cajeroReducer(state: CajeroState, action: CajeroAction): CajeroState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_DATA': return { ...state, ...action.payload };
        case 'SET_NEW_ALERT': return { ...state, hasNewAlert: action.payload };
        case 'SET_ALERT': return { ...state, alertConfig: action.payload };
        default: return state;
    }
}

export default function CajeroHomeScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const insets = useSafeAreaInsets();
    const dataRef = useRef<string>('');

    const [state, dispatch] = useReducer(cajeroReducer, { ...initialState, loading: !initialLoadDone });
    const { loading, refreshing, stats, events, userStatus, hasNewAlert, pendingCount, alertConfig } = state;

    const bg = isDark ? '#0F0D2E' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const showAlert = useCallback((title: string, message: string, type: CajeroState['alertConfig']['type'] = 'info', onConfirm?: () => void, showCancel = false) => {
        dispatch({ type: 'SET_ALERT', payload: { visible: true, title, message, type, onConfirm, showCancel } });
    }, []);

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const [statsRes, userRes, pendingRes, statusRes, eventsRes] = await Promise.allSettled([
                apiClient('/caja/stats'),
                apiClient('/auth/me'),
                apiClient('/solicitudes-servicios/pending-count'),
                apiClient('/users/status'),
                apiClient('/events/user')
            ]);

            const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
            const userResVal = userRes.status === 'fulfilled' ? userRes.value : null;
            const pendingResVal = pendingRes.status === 'fulfilled' ? pendingRes.value : null;
            const statusResVal = statusRes.status === 'fulfilled' ? statusRes.value : null;
            const eventsResVal = eventsRes.status === 'fulfilled' ? eventsRes.value : null;

            const newData = { stats, user: userResVal?.user, pending: pendingResVal?.count || 0, status: statusResVal?.status };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            dispatch({
                type: 'SET_DATA',
                payload: {
                    stats,
                    userStatus: statusResVal?.status || 1,
                    pendingCount: pendingResVal?.count || 0,
                    events: eventsResVal?.data || []
                }
            });

            if (userResVal?.success && userResVal?.user) {
                useAuthStore.getState().updateProfile(userResVal.user);
            }

            if (isManual) {
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching cajero data:', error);
            if (isManual) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar' });
            }
        } finally {
            initialLoadDone = true;
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('refresh_requests', () => {
            fetchData();
        });
        return () => sub.remove();
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

                    if (payload.type === 'new_order' || payload.type === 'new_service_request') {
                        // Navegar automáticamente a la pantalla de solicitudes con el ID para abrir el modal
                        const id = payload.data.id || payload.data.id_solicitud;
                        router.push({
                            pathname: '/cajero/solicitudes',
                            params: { openId: String(id), type: payload.type }
                        });
                        return;
                    }

                    // Refresh on any relevant update
                    if (['venta_created', 'service_created', 'service_finished', 'pending_solicitud', 'user_status_updated', 'order_deleted', 'service_request_deleted'].includes(payload.type)) {
                        console.log(`[CajeroHome] Event ${payload.type} received, refreshing stats`);
                        fetchData();
                    }
                } catch (err) {
                    console.error('[CajeroHome] SSE parse error:', err);
                }
            });
        } catch (err) {
            console.warn('[CajeroHome] SSE init error:', err);
        }

        return () => {
            if (es) es.close();
        };
    }, [user?.id, fetchData]);

    const onRefresh = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchData(true);
    };

    const DashboardSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <LinearGradient
                colors={gradientColors as any}
                style={[styles.headerSkeleton, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.skeletonTopRow}>
                    <SkeletonLoader width={40} height={40} borderRadius={20} />
                    <SkeletonLoader width={40} height={40} borderRadius={20} />
                </View>
                <View style={styles.skeletonProfileRow}>
                    <SkeletonLoader width={70} height={70} borderRadius={35} />
                    <View style={{ gap: 8 }}>
                        <SkeletonLoader width={150} height={20} />
                        <SkeletonLoader width={100} height={15} />
                    </View>
                </View>
            </LinearGradient>
            <View style={styles.skeletonStatsContainer}>
                <View style={styles.skeletonStatsRow}>
                    <SkeletonLoader width={(width - 40) / 2} height={80} borderRadius={16} />
                    <SkeletonLoader width={(width - 40) / 2} height={80} borderRadius={16} />
                </View>
                <View style={styles.skeletonStatsRow}>
                    <SkeletonLoader width={(width - 40) / 2} height={80} borderRadius={16} />
                    <SkeletonLoader width={(width - 40) / 2} height={80} borderRadius={16} />
                </View>
            </View>
            <View style={styles.skeletonGrid}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <SkeletonLoader key={i} width={(width - 40) / 2} height={120} borderRadius={24} />
                ))}
            </View>
        </View>
    );

    if (loading) return <DashboardSkeleton />;

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            {/* Oscuro=header oscuro→iconos light | Claro=header blanco→iconos dark */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={isTablet && styles.tabletContentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <AnimatedScreen>
                    <LinearGradient
                        colors={gradientColors as any}
                        style={[styles.header, { paddingTop: insets.top + (isTablet ? 30 : 10), paddingBottom: isTablet ? 60 : 40 }]}
                    >
                        <View style={isTablet && styles.tabletMaxWidth}>
                            <PremiumHeaderActions
                                hasNewAlert={hasNewAlert}
                                notificationCount={pendingCount}
                                setHasNewAlert={(val) => dispatch({ type: 'SET_NEW_ALERT', payload: val })}
                                onNotificationPress={() => router.push('/cajero/solicitudes')}
                                showAlert={showAlert}
                                profilePath="/cajero/perfil"
                            />
                            <PremiumUserProfile user={user} userStatus={userStatus} />
                        </View>
                    </LinearGradient>

                    <View style={isTablet && styles.tabletMaxWidth}>
                        <PendingSolicitudesAlert isInline />
                        <CajeroStats stats={stats} />

                        <MotiView
                            from={{ opacity: 0, translateY: 30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'spring', delay: 400 }}
                            style={{ marginTop: isTablet ? 30 : 20 }}
                        >
                            <CajeroActionGrid />
                        </MotiView>

                        <MotiView
                            from={{ opacity: 0, translateY: 30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'spring', delay: 500 }}
                            style={{ marginTop: isTablet ? 30 : 25 }}
                        >
                            <PremiumLiquidationCard user={user} events={events} />
                        </MotiView>
                    </View>
                </AnimatedScreen>

                <View style={{ height: 100 }} />
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerSkeleton: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        height: 220,
        backgroundColor: '#2D2870',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    skeletonTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    skeletonProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    skeletonStatsContainer: {
        paddingHorizontal: 15,
        marginTop: -30,
        gap: 10
    },
    skeletonStatsRow: {
        flexDirection: 'row',
        gap: 10
    },
    skeletonGrid: {
        padding: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10
    },
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
    tabletContentContainer: {
        width: '100%',
    },
    tabletMaxWidth: {
        width: '100%',
    },
});
