import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { PremiumCalendar } from '../../../components/PremiumCalendar';
import { PremiumLiquidationCard } from '../../../components/PremiumLiquidationCard';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useAuthStore } from '../../../store/authStore';

interface Event {
    type: 'venta' | 'propina' | 'asistencia' | 'anticipo' | 'comision' | 'servicio';
    id: number;
    codigo: string;
    date: string;
    amount: number;
    estado: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, borderRadius = 10, style = {} }: {
    width: number | string; height: number; borderRadius?: number; style?: any;
}) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 750, easing: Easing.ease, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 750, easing: Easing.ease, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#374151', opacity: anim }, style]} />;
};


export default function AdministrativoScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [recentActivity, setRecentActivity] = useState<Event[]>([]);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const dataRef = useRef<string>('');
    const [isModalVisible, setIsModalVisible] = useState(false);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const eventsRes = await apiClient('/events/user');

            const serialized = JSON.stringify(eventsRes.data || []);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (eventsRes.success) {
                setRecentActivity(eventsRes.data || []);
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
            console.error('Error fetching administrative data:', error);
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar el resumen',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

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
            <View style={{ flex: 1, backgroundColor: bg }}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={isDark ? 'dark' : 'light'} />

                {/* Header skeleton — mismo gradiente */}
                <LinearGradient
                    colors={gradientColors as any}
                    style={[styles.header, {
                        paddingTop: insets.top + (isTablet ? 20 : 10),
                        paddingBottom: 25,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                    }]}
                >
                    <View style={styles.headerTop}>
                        <View style={[styles.backBtn, { backgroundColor: 'rgba(155,155,155,0.15)' }]} />
                        <View style={{ flex: 1, marginLeft: 10, gap: 8 }}>
                            <SkeletonBox
                                width={200}
                                height={22}
                                borderRadius={8}
                                style={{ backgroundColor: isDark ? '#D1D5DB' : 'rgba(255,255,255,0.25)' }}
                            />
                            <SkeletonBox
                                width={130}
                                height={14}
                                borderRadius={6}
                                style={{ backgroundColor: isDark ? '#9CA3AF' : 'rgba(255,255,255,0.18)' }}
                            />
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={{ flex: 1 }} scrollEnabled={false}>
                    <View style={{ padding: 20, gap: 20 }}>

                        {/* Liquidation card skeleton */}
                        <View style={[styles.skeletonCard, { backgroundColor: isDark ? '#1F2937' : '#FFF', borderColor: isDark ? '#374151' : '#E2E8F0' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                <SkeletonBox width={56} height={56} borderRadius={16} />
                                <View style={{ gap: 8, flex: 1 }}>
                                    <SkeletonBox width="60%" height={14} borderRadius={6} />
                                    <SkeletonBox width="40%" height={28} borderRadius={8} />
                                </View>
                            </View>
                            <View style={{ gap: 12 }}>
                                {[1, 2, 3].map(i => (
                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <SkeletonBox width={110} height={12} borderRadius={6} />
                                        <SkeletonBox width={70} height={12} borderRadius={6} />
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Calendar skeleton */}
                        <View style={[styles.skeletonCard, { backgroundColor: isDark ? '#1F2937' : '#FFF', borderColor: isDark ? '#374151' : '#E2E8F0' }]}>
                            {/* Month header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <SkeletonBox width={130} height={16} borderRadius={8} />
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <SkeletonBox width={32} height={32} borderRadius={16} />
                                    <SkeletonBox width={32} height={32} borderRadius={16} />
                                </View>
                            </View>
                            {/* Day names */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <SkeletonBox key={i} width={28} height={12} borderRadius={6} />
                                ))}
                            </View>
                            {/* Day grid — 5 rows */}
                            {[1, 2, 3, 4, 5].map(row => (
                                <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
                                    {[1, 2, 3, 4, 5, 6, 7].map(col => (
                                        <SkeletonBox key={col} width={36} height={36} borderRadius={10} />
                                    ))}
                                </View>
                            ))}
                        </View>

                        {/* Recent activity rows */}
                        <View style={{ gap: 12 }}>
                            {[1, 2, 3].map(i => (
                                <View key={i} style={[styles.skeletonCard, {
                                    backgroundColor: isDark ? '#1F2937' : '#FFF',
                                    borderColor: isDark ? '#374151' : '#E2E8F0',
                                    flexDirection: 'row', alignItems: 'center', gap: 14
                                }]}>
                                    <SkeletonBox width={44} height={44} borderRadius={14} />
                                    <View style={{ flex: 1, gap: 8 }}>
                                        <SkeletonBox width="55%" height={13} borderRadius={6} />
                                        <SkeletonBox width="35%" height={11} borderRadius={6} />
                                    </View>
                                    <SkeletonBox width={60} height={14} borderRadius={6} />
                                </View>
                            ))}
                        </View>

                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header — mismo patrón que cuentas/ventas/servicios */}
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
                        onPress={() => router.back()}
                        style={styles.backBtn}
                        accessibilityLabel="Volver"
                    >
                        <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color="#FFFFFF" />
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.headerTitle, { color: '#FFFFFF' }, isTablet && { fontSize: 28 }]}>
                            Resumen Administrativo
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }, isTablet && { fontSize: 17 }]}>
                            Actividad y eventos
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <PremiumLiquidationCard
                        user={user}
                        events={recentActivity}
                        title="Mis Ingresos"
                        totalLabel="Total Acumulado"
                    />
                </View>

                <View style={{ marginTop: 10 }}>
                    <PremiumCalendar
                        events={recentActivity}
                        selectedDates={selectedDates}
                        onDateToggle={(dateStr) => {
                            setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
                        }}
                    />
                </View>

                {selectedDates.length > 0 && (
                    <View style={[styles.selectionFloat, { backgroundColor: isDark ? '#1F2937' : '#374151' }]}>
                        <Text style={[styles.selectionText, { color: '#FFF' }]}>{selectedDates.length} días seleccionados</Text>
                        <View style={styles.selectionActions}>
                            <Pressable onPress={() => setSelectedDates([])} style={styles.clearBtn}><Text style={styles.clearBtnText}>Borrar</Text></Pressable>
                            <Pressable onPress={() => setIsModalVisible(true)} style={[styles.viewBtn, { backgroundColor: accentColor }]}><Text style={styles.viewBtnText}>Detalles</Text></Pressable>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlayBottom}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>

                        {/* Drag handle */}
                        <View style={styles.dragHandle} />

                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>Eventos Detallados</Text>
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>{selectedDates.length} {selectedDates.length === 1 ? 'día seleccionado' : 'días seleccionados'} · {selectedEvents.length} eventos</Text>
                            </View>
                            <Pressable
                                style={[styles.closeBtn, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}
                                onPress={() => setIsModalVisible(false)}
                                accessibilityLabel="Cerrar modal"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={22} color={textPrimary} />
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
                                            <Text style={[styles.eventTitle, { color: textPrimary }]}>
                                                {item.type.toUpperCase()} {item.codigo}
                                            </Text>
                                            <Text style={[styles.eventTime, { color: textSecondary }]}>
                                                {new Date(item.date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={[styles.eventPrice, { color: isAnticipo ? '#EF4444' : '#10B981' }]}>
                                            {isAnticipo ? '-' : '+'}${item.amount.toLocaleString()}
                                        </Text>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                            ListEmptyComponent={
                                <View style={styles.emptyEvents}>
                                    <Ionicons name="calendar-outline" size={48} color={textSecondary} />
                                    <Text style={[styles.emptyEventsText, { color: textSecondary }]}>Sin eventos en los días seleccionados</Text>
                                </View>
                            }
                        />

                        {/* Botón cerrar fijo al fondo */}
                        <View style={[styles.modalFooter, { backgroundColor: bg, borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Pressable
                                style={[styles.closeFooterBtn, { backgroundColor: accentColor }]}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.closeFooterBtnText}>Cerrar</Text>
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
    skeletonCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
    // Header — mismo patrón que cuentas/ventas/servicios
    header: { paddingHorizontal: 16 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerSubtitle: { fontSize: 15, fontWeight: '500', opacity: 0.8 },
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
    selectionText: { fontWeight: '700' },
    selectionActions: { flexDirection: 'row', gap: 10 },
    clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    clearBtnText: { color: '#EF4444', fontWeight: '800' },
    viewBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    viewBtnText: { color: '#FFF', fontWeight: '800' },
    modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '80%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 14, marginBottom: 4 },
    modalHeader: { paddingHorizontal: 25, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#37415120' },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    modalSubtitle: { fontSize: 14, marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    eventItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    eventInfo: { flex: 1, marginLeft: 15 },
    eventTitle: { fontSize: 15, fontWeight: '700' },
    eventTime: { fontSize: 12, marginTop: 2 },
    eventPrice: { fontSize: 16, fontWeight: '800' },
    emptyEvents: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    emptyEventsText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    modalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
    closeFooterBtn: { height: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E11D48' },
    closeFooterBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
