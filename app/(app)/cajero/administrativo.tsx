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
import { apiClient } from '@/api/client';
// Componentes locales refactoreados
import { EventDetailModal } from '@/components/shared/EventDetailModal';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumCalendar } from '@/components/ui/PremiumCalendar';
import { PremiumLiquidationCard } from '@/components/shared/PremiumLiquidationCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';

interface Event {
    type: 'venta' | 'propina' | 'asistencia' | 'anticipo' | 'comision' | 'servicio';
    id: number;
    codigo: string;
    date: string;
    amount: number;
    estado: number;
    subType?: string;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────────────────
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
    }, [anim]);
    return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#111111', opacity: anim }, style]} />;
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
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [eventDetail, setEventDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

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
            const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            return selectedDates.includes(dateStr);
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDates, recentActivity]);

    const typeLabels: Record<string, string> = {
        comision: "Comisión",
        asistencia: "Asistencia",
        anticipo: "Anticipo",
        propina: "Propina",
        venta: "Venta",
        servicio: "Servicio",
        gratificacion: "Gratificación"
    };

    const getEventLabel = (item: any) => {
        if (!item) return "";
        if (item.type === 'comision') {
            if (item.subType === 'venta') return "Comisión de Venta";
            if (item.subType === 'servicio') return "Comisión de Servicio";
            return "Comisión";
        }
        if (item.type === 'propina') {
            if (item.subType === 'venta') return "Propina de Venta";
            return "Propina";
        }
        return typeLabels[item.type] || item.type.toUpperCase();
    };

    const handleSelectEvent = async (item: any) => {
        setEventDetail(null);
        setLoadingDetail(false);
        setSelectedEvent(item);
        if (['comision', 'propina', 'asistencia', 'anticipo'].includes(item.type)) {
            setLoadingDetail(true);
            try {
                const res = await apiClient(`/events/detail/${item.id}?type=${item.type}`);
                if (res.success && res.data) setEventDetail(res.data);
            } catch (e) {
                console.error('detail fetch error', e);
            } finally {
                setLoadingDetail(false);
            }
        }
    };

    const getStatusLabel = (status: any) => {
        if (typeof status === 'string') return status.toUpperCase();
        if (status === 1) return 'PENDIENTE';
        if (status === 2) return 'CONFIRMADO';
        if (status === 3) return 'RECHAZADO';
        return 'COMPLETADO';
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: bg }}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={isDark ? 'light' : 'dark'} />

                <PremiumHeader
                    title="Resumen Administrativo"
                    subtitle="Actividad y eventos"
                />

                <ScrollView style={{ flex: 1 }} scrollEnabled={false}>
                    <View style={{ padding: 20, gap: 20 }}>
                        <View style={[styles.skeletonCard, { backgroundColor: isDark ? '#111111' : '#FFF', borderColor: isDark ? '#374151' : '#E2E8F0' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                <SkeletonBox width={56} height={56} borderRadius={16} />
                                <View style={{ gap: 8, flex: 1 }}>
                                    <SkeletonBox width="60%" height={14} borderRadius={6} />
                                    <SkeletonBox width="40%" height={28} borderRadius={8} />
                                </View>
                            </View>
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

            <PremiumHeader
                title="Resumen Administrativo"
                subtitle="Actividad y eventos"
                rightComponent={
                    <View style={styles.headerActions}>
                        <Pressable
                            onPress={() => router.back()}
                            style={styles.backBtnRight}
                        >
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextHeader}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <PremiumLiquidationCard
                        user={user}
                        events={recentActivity}
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
                    <View style={[styles.selectionFloat, { backgroundColor: cardBg, borderWidth: 1, borderColor }]}>
                        <Text style={[styles.selectionText, { color: textPrimary }]}>{selectedDates.length} {selectedDates.length === 1 ? 'día' : 'días'} seleccionados</Text>
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
                                    <Pressable 
                                        onPress={() => handleSelectEvent(item)}
                                        style={({ pressed }) => [
                                            styles.eventItem, 
                                            { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.7 : 1 }
                                        ]}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                                            <Ionicons name={iconName as any} size={18} color={iconColor} />
                                        </View>
                                        <View style={styles.eventInfo}>
                                            <Text style={[styles.eventTitle, { color: textPrimary }]}>
                                                {getEventLabel(item)} {item.codigo && item.codigo !== 'TIPS' ? `- ${item.codigo}` : ''}
                                            </Text>
                                            <Text style={[styles.eventTime, { color: textSecondary }]}>
                                                {new Date(item.date).toLocaleDateString("es-ES", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.eventPrice, { color: isAnticipo ? '#EF4444' : '#10B981' }]}>
                                                {isAnticipo ? '-' : '+'}${item.amount.toLocaleString()}
                                            </Text>
                                            <Text style={[styles.statusMiniText, { color: textSecondary }]}>
                                                {getStatusLabel(item.estado)}
                                            </Text>
                                        </View>
                                    </Pressable>
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
            <EventDetailModal
                visible={!!selectedEvent}
                event={selectedEvent}
                eventDetail={eventDetail}
                loadingDetail={loadingDetail}
                onClose={() => { setSelectedEvent(null); setEventDetail(null); }}
                getEventLabel={getEventLabel}
                getStatusLabel={getStatusLabel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    backBtnRight: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 38, 
        borderRadius: 12, 
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    skeletonCard: { borderRadius: 20, borderWidth: 1, padding: 16 },

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
    closeFooterBtn: { height: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    closeFooterBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
    statusMiniText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4
    }
});
