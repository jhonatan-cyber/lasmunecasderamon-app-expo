import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    Text as RNText,
    ScrollView,
    StyleSheet,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../../api/client';
import { AnimatedScreen } from '../../../../components/AnimatedScreen';
import { GarzonActionCard } from '../../../../components/GarzonActionCard';
import { GarzonStats } from '../../../../components/GarzonStats';
import { PremiumCalendar } from '../../../../components/PremiumCalendar';
import { PremiumHeaderActions } from '../../../../components/PremiumHeaderActions';
import { PremiumLiquidationCard } from '../../../../components/PremiumLiquidationCard';
import { PremiumUserProfile } from '../../../../components/PremiumUserProfile';
import { StaggeredFadeIn } from '../../../../components/StaggeredFadeIn';
import { useAuthStore } from '../../../../store/authStore';

const { width } = Dimensions.get('window');

type GarzonState = {
    loading: boolean;
    refreshing: boolean;
    stats: any;
    recentActivity: any[];
    userStatus: number;
    hasNewAlert: boolean;
    selectedDates: string[];
    isModalVisible: boolean;
    hasOpenCaja: boolean;
    alertConfig: {
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    };
};

type GarzonAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_DATA'; payload: Partial<GarzonState> }
    | { type: 'UPDATE_SELECTED_DATES'; payload: string[] }
    | { type: 'SET_MODAL_VISIBLE'; payload: boolean }
    | { type: 'SET_ALERT'; payload: GarzonState['alertConfig'] }
    | { type: 'SET_NEW_ALERT'; payload: boolean };

const initialGarzonState: GarzonState = {
    loading: true,
    refreshing: false,
    stats: null,
    recentActivity: [],
    userStatus: 1,
    hasNewAlert: false,
    selectedDates: [],
    isModalVisible: false,
    hasOpenCaja: true,
    alertConfig: { visible: false, title: '', message: '', type: 'info' },
};

function garzonReducer(state: GarzonState, action: GarzonAction): GarzonState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_DATA': return { ...state, ...action.payload };
        case 'UPDATE_SELECTED_DATES': return { ...state, selectedDates: action.payload };
        case 'SET_MODAL_VISIBLE': return { ...state, isModalVisible: action.payload };
        case 'SET_ALERT': return { ...state, alertConfig: action.payload };
        case 'SET_NEW_ALERT': return { ...state, hasNewAlert: action.payload };
        default: return state;
    }
}

export default function GarzonHomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const insets = useSafeAreaInsets();
    const dataRef = useRef<string>('');

    const [state, dispatch] = useReducer(garzonReducer, initialGarzonState);
    const {
        loading, refreshing, stats, recentActivity, userStatus,
        hasNewAlert, selectedDates, isModalVisible, hasOpenCaja, alertConfig
    } = state;

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const showAlert = useCallback((title: string, message: string, type: GarzonState['alertConfig']['type'] = 'info', onConfirm?: () => void, showCancel = false) => {
        dispatch({ type: 'SET_ALERT', payload: { visible: true, title, message, type, onConfirm, showCancel } });
    }, []);

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const [statsRes, eventsRes, userRes, cajaRes, statusRes] = await Promise.all([
                apiClient('/events/stats'),
                apiClient('/events/user'),
                apiClient('/auth/me'),
                apiClient('/cashregister/status'),
                apiClient('/users/status')
            ]);

            const newData = { stats: statsRes.data, events: eventsRes.data, user: userRes.user, caja: cajaRes.data, status: statusRes.status };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            dispatch({
                type: 'SET_DATA',
                payload: {
                    stats: statsRes.data,
                    recentActivity: eventsRes.data || [],
                    hasOpenCaja: cajaRes.data?.hasOpenCaja ?? true,
                    userStatus: statusRes.status ?? 1
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
            console.error('Error fetching garzon data:', error);
            if (isManual) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar' });
            }
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchData(true);
    }, [fetchData]);

    const selectedEvents = useMemo(() => {
        if (selectedDates.length === 0) return [];
        return recentActivity.filter(e => {
            const d = new Date(e.date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return selectedDates.includes(dateStr);
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDates, recentActivity]);

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
            >
                <AnimatedScreen>
                    <LinearGradient
                        colors={isDark ? ['#1E1B4B', '#000000'] : ['#E0E7FF', '#F3F4F6']}
                        style={[styles.header, { paddingTop: insets.top + 10 }]}
                    >
                        <PremiumHeaderActions
                            hasNewAlert={hasNewAlert}
                            setHasNewAlert={(val) => dispatch({ type: 'SET_NEW_ALERT', payload: val })}
                            showAlert={showAlert}
                            profilePath="/garzon/perfil"
                        />
                        <PremiumUserProfile user={user} userStatus={userStatus} />
                    </LinearGradient>

                    <GarzonStats stats={stats} />

                    <View style={styles.actionGrid}>
                        <StaggeredFadeIn index={0} style={{ flex: 1 }}>
                            <GarzonActionCard
                                title="PEDIDOS"
                                description={hasOpenCaja ? "Inicia una nueva orden" : "Caja cerrada"}
                                icon="beer"
                                color="#8B5CF6"
                                disabled={!hasOpenCaja}
                                onPress={() => router.push('/(app)/garzon/pedidos')}
                            />
                        </StaggeredFadeIn>

                        <StaggeredFadeIn index={1} style={{ flex: 1 }}>
                            <GarzonActionCard
                                title="SERVICIOS"
                                description={hasOpenCaja ? "Control de salones" : "Caja cerrada"}
                                icon="bed"
                                color="#10B981"
                                disabled={!hasOpenCaja}
                                onPress={() => router.push('/(app)/garzon/servicios')}
                            />
                        </StaggeredFadeIn>
                    </View>

                    {!hasOpenCaja && (
                        <View style={styles.cajaWarning}>
                            <Ionicons name="alert-circle" size={16} color="#EF4444" />
                            <RNText style={styles.cajaWarningText}>No puedes realizar pedidos sin una caja abierta.</RNText>
                        </View>
                    )}

                    <View style={{ marginTop: 15 }}>
                        <PremiumLiquidationCard
                            user={user}
                            events={recentActivity}
                            title="Resumen de Propinas y Ventas"
                            totalLabel="Ingresos Acumulados"
                        />
                    </View>

                    <PremiumCalendar
                        events={recentActivity}
                        selectedDates={selectedDates}
                        onDateToggle={(dateStr) => {
                            const next = selectedDates.includes(dateStr)
                                ? selectedDates.filter(d => d !== dateStr)
                                : [...selectedDates, dateStr];
                            dispatch({ type: 'UPDATE_SELECTED_DATES', payload: next });
                        }}
                    />

                    {selectedDates.length > 0 && (
                        <View style={styles.selectionFloat}>
                            <RNText style={[styles.selectionText, { color: '#FFF' }]}>{selectedDates.length} días seleccionados</RNText>
                            <View style={styles.selectionActions}>
                                <Pressable
                                    onPress={() => dispatch({ type: 'UPDATE_SELECTED_DATES', payload: [] })}
                                    style={styles.clearBtn}
                                    accessibilityLabel="Borrar selección"
                                    accessibilityRole="button"
                                >
                                    <RNText style={styles.clearBtnText}>Borrar</RNText>
                                </Pressable>
                                <Pressable
                                    onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: true })}
                                    style={styles.viewBtn}
                                    accessibilityLabel="Ver detalles"
                                    accessibilityRole="button"
                                >
                                    <RNText style={styles.viewBtnText}>Detalles</RNText>
                                </Pressable>
                            </View>
                        </View>
                    )}
                    <View style={{ height: 100 }} />
                </AnimatedScreen>
            </ScrollView>

            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })}>
                <View style={styles.modalOverlayBottom}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <RNText style={[styles.modalTitle, { color: textPrimary }]}>Eventos Detallados</RNText>
                                <RNText style={[styles.modalSubtitle, { color: textSecondary }]}>{selectedDates.length} días</RNText>
                            </View>
                            <Pressable
                                style={[styles.closeBtn, { backgroundColor: cardBg }]}
                                onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })}
                                accessibilityLabel="Cerrar modal"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>
                        <FlatList
                            data={selectedEvents}
                            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
                            renderItem={({ item }) => {
                                const isAnticipo = item.type === 'anticipo';
                                const iconColor = isAnticipo ? '#EF4444' : '#10B981';
                                return (
                                    <View style={[styles.eventItem, { backgroundColor: cardBg, borderColor }]}>
                                        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                                            <Ionicons name="cash-outline" size={18} color={iconColor} />
                                        </View>
                                        <View style={styles.eventInfo}>
                                            <RNText style={[styles.eventTitle, { color: textPrimary }]}>{item.type.toUpperCase()} {item.codigo}</RNText>
                                            <RNText style={[styles.eventTime, { color: textSecondary }]}>{new Date(item.date).toLocaleDateString()}</RNText>
                                        </View>
                                        <RNText style={[styles.eventPrice, { color: isAnticipo ? '#EF4444' : '#10B981' }]}>{isAnticipo ? '-' : '+'}${item.amount.toLocaleString()}</RNText>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{ padding: 20 }}
                        />
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={alertConfig.visible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.alertCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <RNText style={[styles.alertTitle, { color: textPrimary }]}>{alertConfig.title}</RNText>
                        <RNText style={[styles.alertMessage, { color: textSecondary }]}>{alertConfig.message}</RNText>
                        <View style={styles.alertActions}>
                            {alertConfig.showCancel && (
                                <Pressable
                                    style={[styles.alertBtn, { flex: 1 }]}
                                    onPress={() => dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } })}
                                    accessibilityLabel="Cancelar"
                                    accessibilityRole="button"
                                >
                                    <RNText style={[styles.alertBtnText, { color: textSecondary }]}>Cancelar</RNText>
                                </Pressable>
                            )}
                            <Pressable
                                style={[styles.alertBtn, { backgroundColor: '#8B5CF6', flex: 1.5 }]}
                                onPress={() => {
                                    dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } });
                                    alertConfig.onConfirm?.();
                                }}
                                accessibilityLabel="Aceptar"
                                accessibilityRole="button"
                            >
                                <RNText style={styles.alertBtnText}>Aceptar</RNText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    actionGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 20 },
    cajaWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 10, gap: 6 },
    cajaWarningText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
    selectionFloat: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#1F2937', padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
    selectionText: { fontWeight: '700' },
    selectionActions: { flexDirection: 'row', gap: 10 },
    clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    clearBtnText: { color: '#EF4444', fontWeight: '800' },
    viewBtn: { backgroundColor: '#8B5CF6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    viewBtnText: { color: '#FFF', fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '80%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    modalHeader: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#37415120' },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    modalSubtitle: { fontSize: 14, marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    eventItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    eventInfo: { flex: 1, marginLeft: 15 },
    eventTitle: { fontSize: 15, fontWeight: '700' },
    eventTime: { fontSize: 12, marginTop: 2 },
    eventPrice: { fontSize: 16, fontWeight: '800' },
    alertCard: { width: '85%', borderRadius: 32, padding: 24, alignItems: 'center' },
    alertTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
    alertMessage: { textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 25, paddingHorizontal: 10 },
    alertActions: { flexDirection: 'row', gap: 12, width: '100%' },
    alertBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
