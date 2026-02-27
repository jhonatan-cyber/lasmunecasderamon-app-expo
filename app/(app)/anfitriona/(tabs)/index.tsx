import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { DonutChart } from '../../../../components/DonutChart';
import { PremiumAlert } from '../../../../components/PremiumAlert';
import { PremiumCalendar } from '../../../../components/PremiumCalendar';
import { PremiumHeaderActions } from '../../../../components/PremiumHeaderActions';
import { PremiumLiquidationCard } from '../../../../components/PremiumLiquidationCard';
import { getStatusColor, getStatusLabel, PremiumUserProfile } from '../../../../components/PremiumUserProfile';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useAuthStore } from '../../../../store/authStore';

// --- Constants ---
const { width } = Dimensions.get('window');

interface Event {
    type: 'servicio' | 'comision' | 'asistencia' | 'anticipo';
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

interface Badge {
    id: string;
    icon: string;
    title: string;
    description: string;
}

export default function AnfitrionaHomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [events, setEvents] = useState<Event[]>([]);
    const [stats, setStats] = useState<{ weeklyIncome: Stat[], badges: Badge[], totalEarnings: number, svcCount: number }>({ weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [userStatus, setUserStatus] = useState<number>(1); // 1: Disponible, 2: Ocupada, 3: Descanso
    const [hasNewAlert, setHasNewAlert] = useState(false);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const dataRef = useRef<{ events: any[], stats: any, status: number }>({ events: [], stats: {}, status: 1 });

    useEffect(() => {
        dataRef.current = { events, stats, status: userStatus };
    }, [events, stats, userStatus]);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
        Toast.show({
            type: type === 'info' ? 'info' : 'success',
            text1: type === 'success' ? 'Éxito' : 'Información',
            text2: message,
            visibilityTime: 3000
        });
    }, []);

    const showAlert = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info', onConfirm?: () => void, showCancel = false) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
    }, []);

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const [eventsRes, statsRes, userRes] = await Promise.all([
                apiClient('/events/user'),
                apiClient('/events/stats'),
                apiClient('/auth/me')
            ]);

            let hasChanges = false;

            if (eventsRes.success) {
                if (JSON.stringify(eventsRes.data) !== JSON.stringify(dataRef.current.events)) hasChanges = true;
                setEvents(eventsRes.data || []);
            }
            if (statsRes.success) {
                if (JSON.stringify(statsRes.data) !== JSON.stringify(dataRef.current.stats)) hasChanges = true;
                setStats(statsRes.data);
            }
            if (userRes.success && userRes.user) {
                if (userRes.user.status !== dataRef.current.status) hasChanges = true;
                setUserStatus(userRes.user.status || 1);

                const currentStoreUser = useAuthStore.getState().user;
                if (JSON.stringify(userRes.user) !== JSON.stringify(currentStoreUser)) {
                    useAuthStore.getState().updateProfile(userRes.user);
                }
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
            if (isManual) showToast('Error al actualizar', 'info');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const updateStatus = async (newStatus: number) => {
        try {
            const res = await apiClient('/users/status', {
                method: 'POST',
                body: JSON.stringify({ status: newStatus })
            });
            if (res.success) {
                setUserStatus(newStatus);
            }
        } catch (error) {
            showAlert('Error', 'No se pudo actualizar el estado', 'danger');
        }
    };

    const dailyGrowth = useMemo(() => {
        if (!stats?.weeklyIncome || stats.weeklyIncome.length < 2) return 0;
        const sorted = [...stats.weeklyIncome].sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());
        const today = sorted[0]?.total || 0;
        const yesterday = sorted[1]?.total || 1; // avoid div by zero
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

    const DashboardSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <View style={[styles.header, { paddingTop: insets.top + 10, height: 160 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Skeleton width={100} height={40} borderRadius={20} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Skeleton width={40} height={40} borderRadius={20} />
                        <Skeleton width={40} height={40} borderRadius={20} />
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <Skeleton width={80} height={80} borderRadius={40} />
                    <View style={{ gap: 8 }}>
                        <Skeleton width={120} height={20} />
                        <Skeleton width={80} height={15} />
                    </View>
                </View>
            </View>

            <View style={styles.statusControlGrid}>
                {[1, 2, 3].map(i => <Skeleton key={i} style={{ flex: 1 }} height={40} borderRadius={12} />)}
            </View>

            <View style={styles.analyticsRow}>
                <Skeleton style={{ flex: 1 }} height={140} borderRadius={24} />
                <Skeleton style={{ flex: 1 }} height={140} borderRadius={24} />
            </View>

            <View style={{ marginHorizontal: 16, marginTop: 15 }}>
                <Skeleton height={180} borderRadius={24} />
            </View>

            <View style={{ marginHorizontal: 16, marginTop: 25, gap: 15 }}>
                <Skeleton width={150} height={25} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Skeleton width={120} height={100} borderRadius={20} />
                    <Skeleton width={120} height={100} borderRadius={20} />
                    <Skeleton width={120} height={100} borderRadius={20} />
                </View>
            </View>
        </View>
    );

    if (loading) return <DashboardSkeleton />;

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
            >
                {/* Premium Header */}
                <LinearGradient
                    colors={isDark ? ['#1E1B4B', '#000000'] : ['#F3F4F6', '#FFFFFF']}
                    style={[styles.header, { paddingTop: insets.top + 10 }]}
                >
                    <PremiumHeaderActions
                        hasNewAlert={hasNewAlert}
                        setHasNewAlert={setHasNewAlert}
                        showAlert={showAlert}
                        profilePath="/anfitriona/perfil"
                    />
                    <PremiumUserProfile user={user} userStatus={userStatus} />
                </LinearGradient>

                {/* Availability Control */}
                <View style={styles.statusControlGrid}>
                    {[1, 2, 3].map(s => (
                        <Pressable
                            key={s}
                            style={[
                                styles.statusBtn,
                                { backgroundColor: cardBg, borderColor: userStatus === s ? getStatusColor(s, isDark) : borderColor },
                                userStatus === s && { borderWidth: 2 }
                            ]}
                            onPress={() => updateStatus(s)}
                        >
                            <RNText style={[styles.statusBtnText, { color: userStatus === s ? getStatusColor(s, isDark) : textSecondary }]}>
                                {getStatusLabel(s)}
                            </RNText>
                        </Pressable>
                    ))}
                </View>

                {/* Premium Analytics Cards */}
                <View style={styles.analyticsRow}>
                    <View style={[styles.glassCard, { flex: 1, backgroundColor: cardBg, borderColor, minHeight: 140, padding: 12, overflow: 'hidden' }]}>
                        <LinearGradient
                            colors={isDark ? ['transparent', '#1E1B4B40'] : ['transparent', 'rgba(0,0,0,0.02)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Meta Semanal</RNText>
                            <Ionicons name="flag" size={14} color="#8B5CF6" />
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <DonutChart
                                percent={Math.min(100, Math.round(((stats?.totalEarnings || 0) / 50000) * 100))}
                                color="#8B5CF6"
                                isDark={isDark}
                                size={70}
                                strokeWidth={5}
                            />
                            <RNText style={[styles.goalStatus, { color: textSecondary, marginTop: 4, fontSize: 10 }]}>
                                ${(stats?.totalEarnings || 0).toLocaleString()} <RNText style={{ opacity: 0.5 }}>/ $50k</RNText>
                            </RNText>
                        </View>
                    </View>

                    <View style={[styles.glassCard, { flex: 1, backgroundColor: cardBg, borderColor, minHeight: 140, padding: 12, overflow: 'hidden' }]}>
                        <LinearGradient
                            colors={isDark ? ['transparent', '#064E3B40'] : ['transparent', 'rgba(0,0,0,0.02)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Crecimiento</RNText>
                            <Ionicons name="trending-up" size={14} color={dailyGrowth >= 0 ? '#10B981' : '#EF4444'} />
                        </View>
                        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <RNText style={[styles.bigStat, { color: dailyGrowth >= 0 ? '#10B981' : '#EF4444', fontSize: 28 }]}>
                                {dailyGrowth >= 0 ? '+' : ''}{dailyGrowth}%
                            </RNText>
                            <RNText style={[styles.statLabel, { color: textSecondary, fontSize: 10 }]}>v/s ayer</RNText>
                            <View style={[styles.trendTag, { marginTop: 2, backgroundColor: dailyGrowth >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                                <Ionicons name={dailyGrowth >= 0 ? "arrow-up" : "arrow-down"} size={8} color={dailyGrowth >= 0 ? "#10B981" : "#EF4444"} />
                                <RNText style={[styles.trendText, { fontSize: 9, color: dailyGrowth >= 0 ? "#10B981" : "#EF4444" }]}>
                                    {stats?.svcCount || 0} svc
                                </RNText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Income Trend Chart */}
                <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor, marginHorizontal: 16, marginTop: 15 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Ingresos Semanales</RNText>
                            <RNText style={{ fontSize: 11, color: textSecondary }}>Tendencia de los últimos 7 días</RNText>
                        </View>
                        <View style={styles.chartLegend}>
                            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                            <RNText style={[styles.legendText, { color: textSecondary }]}>Comisiones</RNText>
                        </View>
                    </View>

                    <View style={styles.chartContainer}>
                        {stats?.weeklyIncome?.length > 0 ? (
                            (() => {
                                const max = Math.max(...stats.weeklyIncome.map(x => x.total), 1);
                                return stats.weeklyIncome.map((s, i) => {
                                    const height = (s.total / max) * 100;
                                    const isToday = new Date(s.day).toDateString() === new Date().toDateString();
                                    return (
                                        <View key={i} style={styles.chartBarCol}>
                                            <View style={styles.barWrapper}>
                                                <LinearGradient
                                                    colors={isToday ? ['#C084FC', '#8B5CF6'] : ['#8B5CF6', '#6D28D9']}
                                                    style={[styles.chartBar, { height: `${Math.max(5, height)}%` }]}
                                                />
                                                {height > 10 && (
                                                    <RNText style={styles.barVal}>${(s.total / 1000).toFixed(0)}k</RNText>
                                                )}
                                            </View>
                                            <RNText style={[styles.chartDay, { color: isToday ? '#8B5CF6' : textSecondary, fontWeight: isToday ? '900' : '500' }]}>
                                                {new Date(s.day).toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase()}
                                            </RNText>
                                        </View>
                                    );
                                });
                            })()
                        ) : (
                            <View style={styles.emptyChart}>
                                <Ionicons name="bar-chart-outline" size={40} color={borderColor} />
                                <RNText style={[styles.noCharts, { color: textSecondary }]}>No hay actividad esta semana</RNText>
                            </View>
                        )}
                    </View>
                </View>

                {/* Achievements Section */}
                {stats?.badges?.length > 0 && (
                    <View style={styles.badgesWrapper}>
                        <RNText style={[styles.sectionTitle, { color: textPrimary, marginLeft: 16 }]}>Tus Logros</RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesList}>
                            {stats.badges.map(b => (
                                <View key={b.id} style={[styles.badgeItem, { backgroundColor: cardBg, borderColor }]}>
                                    <RNText style={styles.badgeIcon}>{b.icon}</RNText>
                                    <RNText style={[styles.badgeTitle, { color: textPrimary }]}>{b.title}</RNText>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <PremiumCalendar
                    events={events}
                    selectedDates={selectedDates}
                    onDateToggle={(dateStr) => {
                        setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
                    }}
                />

                <PremiumLiquidationCard
                    user={user}
                    events={events}
                />

                <View style={{ height: 100 }} />
            </ScrollView>

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

            {/* Modal */}
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
                            keyExtractor={(item) => `${item.type}-${item.id}`}
                            renderItem={({ item }) => {
                                const isAnticipo = item.type === 'anticipo';
                                const iconName = item.type === 'servicio' ? 'heart' :
                                    item.type === 'comision' ? 'wallet' :
                                        item.type === 'asistencia' ? 'calendar' : 'cash';
                                const iconColor = isAnticipo ? '#EF4444' : '#8B5CF6';

                                return (
                                    <View style={[styles.eventItem, { backgroundColor: cardBg, borderColor }]}>
                                        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                                            <Ionicons name={iconName as any} size={18} color={iconColor} />
                                        </View>
                                        <View style={styles.eventInfo}>
                                            <RNText style={[styles.eventTitle, { color: textPrimary }]}>
                                                {item.type === 'comision' ? 'VENTA' : item.type.toUpperCase()} {item.codigo}
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

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={() => {
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                    alertConfig.onConfirm?.();
                }}
                onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                showCancel={alertConfig.showCancel}
                confirmText={alertConfig.type === 'danger' ? 'Confirmar' : 'Aceptar'}
                cancelText="Cancelar"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 10 },
    statusControlGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
    statusBtn: { flex: 1, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    statusBtnText: { fontSize: 13, fontWeight: '700' },
    glassCard: { borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    analyticsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 10 },
    bigStat: { fontSize: 32, fontWeight: '900' },
    statLabel: { fontSize: 11, fontWeight: '600' },
    trendTag: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    trendText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
    chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, fontWeight: '600' },
    chartContainer: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 10 },
    chartBarCol: { flex: 1, alignItems: 'center', height: '100%' },
    barWrapper: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
    chartBar: { width: 14, borderRadius: 7, minHeight: 4 },
    barVal: { fontSize: 8, fontWeight: '800', position: 'absolute', top: -14, color: '#8B5CF6', width: 40, textAlign: 'center' },
    chartDay: { fontSize: 10, fontWeight: '700', marginTop: 12 },
    goalStatus: { textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: 8 },
    emptyChart: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    noCharts: { fontSize: 13, fontWeight: '600' },
    badgesWrapper: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    badgesList: { paddingHorizontal: 16, gap: 12 },
    badgeItem: { padding: 12, borderRadius: 20, borderWidth: 1, width: 120, alignItems: 'center' },
    badgeIcon: { fontSize: 32, marginBottom: 6 },
    badgeTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
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
});
