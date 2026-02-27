import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../../api/client';
import { GarzonActionCard } from '../../../../components/GarzonActionCard';
import { GarzonStats } from '../../../../components/GarzonStats';
import { PremiumCalendar } from '../../../../components/PremiumCalendar';
import { PremiumHeaderActions } from '../../../../components/PremiumHeaderActions';
import { PremiumLiquidationCard } from '../../../../components/PremiumLiquidationCard';
import { PremiumUserProfile } from '../../../../components/PremiumUserProfile';
import { useAuthStore } from '../../../../store/authStore';

const { width } = Dimensions.get('window');


interface Event {
    type: 'venta' | 'propina' | 'asistencia' | 'anticipo' | 'comision' | 'servicio';
    id: number;
    codigo: string;
    date: string;
    amount: number;
    estado: number;
}

interface Stat {
    day: string;
    total: number;
}

export default function GarzonHomeScreen() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [recentActivity, setRecentActivity] = useState<Event[]>([]);

    const [userStatus, setUserStatus] = useState<number>(1);
    const [hasNewAlert, setHasNewAlert] = useState(false);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [hasOpenCaja, setHasOpenCaja] = useState<boolean>(true); // Default to true to avoid flicker
    const dataRef = useRef<string>('');

    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger'; onConfirm?: () => void; showCancel?: boolean }>({ visible: false, title: '', message: '', type: 'info' });

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info', onConfirm?: () => void, showCancel = false) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
    };

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const [statsRes, eventsRes, userRes, cajaRes] = await Promise.all([
                apiClient('/events/stats'),
                apiClient('/events/user'),
                apiClient('/auth/me'),
                apiClient('/cashregister/status')
            ]);

            const newData = { stats: statsRes.data, events: eventsRes.data, user: userRes.user, caja: cajaRes.data };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (statsRes.success) setStats(statsRes.data);
            if (eventsRes.success) setRecentActivity(eventsRes.data || []);
            if (userRes.success && userRes.user) useAuthStore.getState().updateProfile(userRes.user);
            if (cajaRes.success && cajaRes.data) setHasOpenCaja(cajaRes.data.hasOpenCaja);

            // Sync status
            const statusRes = await apiClient('/users/status');
            if (statusRes.success && statusRes.status) {
                setUserStatus(statusRes.status);
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
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isDark]);



    const selectedEvents = useMemo(() => {
        if (selectedDates.length === 0) return [];
        return recentActivity.filter(e => {
            const d = new Date(e.date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return selectedDates.includes(dateStr);
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDates, recentActivity]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

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
                {/* Premium Header */}
                <LinearGradient
                    colors={isDark ? ['#1E1B4B', '#000000'] : ['#E0E7FF', '#F3F4F6']}
                    style={[styles.header, { paddingTop: insets.top + 10 }]}
                >
                    <PremiumHeaderActions
                        hasNewAlert={hasNewAlert}
                        setHasNewAlert={setHasNewAlert}
                        showAlert={showAlert}
                        profilePath="/garzon/perfil"
                    />

                    <PremiumUserProfile user={user} userStatus={userStatus} />
                </LinearGradient>


                <GarzonStats stats={stats} />

                {/* Main Action Grid */}
                <View style={styles.actionGrid}>
                    <GarzonActionCard
                        title="PEDIDOS"
                        description={hasOpenCaja ? "Inicia una nueva orden" : "Caja cerrada"}
                        icon="beer"
                        color="#8B5CF6"
                        disabled={!hasOpenCaja}
                        onPress={() => router.push('/(app)/garzon/pedidos')}
                    />

                    <GarzonActionCard
                        title="SERVICIOS"
                        description={hasOpenCaja ? "Control de salones" : "Caja cerrada"}
                        icon="bed"
                        color="#10B981"
                        disabled={!hasOpenCaja}
                        onPress={() => router.push('/(app)/garzon/servicios')}
                    />
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
                        setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
                    }}
                />

                {/* Selection Bar */}
                {selectedDates.length > 0 && (
                    <View style={styles.selectionFloat}>
                        <RNText style={[styles.selectionText, { color: '#FFF' }]}>{selectedDates.length} días seleccionados</RNText>
                        <View style={styles.selectionActions}>
                            <Pressable onPress={() => setSelectedDates([])} style={styles.clearBtn}><RNText style={styles.clearBtnText}>Borrar</RNText></Pressable>
                            <Pressable onPress={() => setIsModalVisible(true)} style={styles.viewBtn}><RNText style={styles.viewBtnText}>Detalles</RNText></Pressable>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Events Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlayBottom}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <RNText style={[styles.modalTitle, { color: textPrimary }]}>Eventos Detallados</RNText>
                                <RNText style={[styles.modalSubtitle, { color: textSecondary }]}>{selectedDates.length} días</RNText>
                            </View>
                            <Pressable style={[styles.closeBtn, { backgroundColor: cardBg }]} onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>
                        <FlatList
                            data={selectedEvents}
                            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
                            renderItem={({ item }) => {
                                const isAnticipo = item.type === 'anticipo';
                                const iconName = item.type === 'venta' ? 'fast-food' :
                                    item.type === 'propina' ? 'wallet' :
                                        item.type === 'comision' ? 'star' :
                                            item.type === 'asistencia' ? 'calendar' : 'cash';
                                const iconColor = isAnticipo ? '#EF4444' : '#10B981';

                                return (
                                    <View style={[styles.eventItem, { backgroundColor: cardBg, borderColor }]}>
                                        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                                            <Ionicons name={iconName as any} size={18} color={iconColor} />
                                        </View>
                                        <View style={styles.eventInfo}>
                                            <RNText style={[styles.eventTitle, { color: textPrimary }]}>
                                                {item.type.toUpperCase()} {item.codigo}
                                            </RNText>
                                            <RNText style={[styles.eventTime, { color: textSecondary }]}>
                                                {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                                            </RNText>
                                        </View>
                                        <RNText style={[styles.eventPrice, { color: isAnticipo ? '#EF4444' : '#10B981' }]}>
                                            {isAnticipo ? '-' : '+'}${item.amount.toLocaleString()}
                                        </RNText>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{ padding: 20 }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Custom Alert Modal */}

            <Modal transparent visible={alertConfig.visible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.alertCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <View style={[
                            styles.alertIconBg,
                            { backgroundColor: alertConfig.type === 'success' ? '#10B98120' : alertConfig.type === 'danger' ? '#EF444420' : '#8B5CF620' }
                        ]}>
                            <Ionicons
                                name={alertConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                                size={40}
                                color={alertConfig.type === 'success' ? '#10B981' : alertConfig.type === 'danger' ? '#EF4444' : '#8B5CF6'}
                            />
                        </View>
                        <RNText style={[styles.alertTitle, { color: textPrimary }]}>{alertConfig.title}</RNText>
                        <RNText style={[styles.alertMessage, { color: textSecondary }]}>{alertConfig.message}</RNText>
                        <View style={styles.alertActions}>
                            {alertConfig.showCancel && (
                                <Pressable
                                    style={[styles.alertBtn, { backgroundColor: 'transparent', flex: 1 }]}
                                    onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                                >
                                    <RNText style={[styles.alertBtnText, { color: textSecondary }]}>Cancelar</RNText>
                                </Pressable>
                            )}
                            <Pressable
                                style={[styles.alertBtn, { backgroundColor: '#8B5CF6', flex: 1.5 }]}
                                onPress={() => {
                                    setAlertConfig(prev => ({ ...prev, visible: false }));
                                    alertConfig.onConfirm?.();
                                }}
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
    header: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginBottom: 20,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#8B5CF6',
    },
    avatar: { width: '100%', height: '100%' },
    avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 32 },
    headerInfo: { flex: 1 },
    username: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 13, fontWeight: '600' },
    notificationDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#000' },
    actionGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginTop: 20,
    },
    actionCard: {
        flex: 1,
        borderRadius: 24,
        padding: 20,
        justifyContent: 'center',
    },
    actionTitle: { color: '#FFF', fontWeight: '900', fontSize: 16, marginTop: 12 },
    actionDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    alertCard: { width: '85%', borderRadius: 32, padding: 24, alignItems: 'center' },
    alertIconBg: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    alertTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
    alertMessage: { textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 25, paddingHorizontal: 10 },
    alertActions: { flexDirection: 'row', gap: 12, width: '100%' },
    alertBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    selectionFloat: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#1F2937', padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
    selectionText: { fontWeight: '700' },
    selectionActions: { flexDirection: 'row', gap: 10 },
    clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    clearBtnText: { color: '#EF4444', fontWeight: '800' },
    viewBtn: { backgroundColor: '#8B5CF6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    viewBtnText: { color: '#FFF', fontWeight: '800' },
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
    cajaWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 6
    },
    cajaWarningText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700'
    },
});
