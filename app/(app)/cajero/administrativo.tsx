import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { PremiumCalendar } from '../../../components/PremiumCalendar';
import { PremiumLiquidationCard } from '../../../components/PremiumLiquidationCard';
import { useAuthStore } from '../../../store/authStore';

interface Event {
    type: 'venta' | 'propina' | 'asistencia' | 'anticipo' | 'comision' | 'servicio';
    id: number;
    codigo: string;
    date: string;
    amount: number;
    estado: number;
}

export default function AdministrativoScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const insets = useSafeAreaInsets();

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
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#E11D48" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            {/* Header barra superior personalizada */}
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: cardBg }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Resumen Administrativo</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E11D48" />}
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
                    <View style={styles.selectionFloat}>
                        <Text style={[styles.selectionText, { color: '#FFF' }]}>{selectedDates.length} días seleccionados</Text>
                        <View style={styles.selectionActions}>
                            <Pressable onPress={() => setSelectedDates([])} style={styles.clearBtn}><Text style={styles.clearBtnText}>Borrar</Text></Pressable>
                            <Pressable onPress={() => setIsModalVisible(true)} style={styles.viewBtn}><Text style={styles.viewBtnText}>Detalles</Text></Pressable>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlayBottom}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>Eventos Detallados</Text>
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>{selectedDates.length} días</Text>
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
                            contentContainerStyle={{ padding: 20 }}
                        />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800'
    },
    selectionFloat: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#1F2937',
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
    viewBtn: { backgroundColor: '#E11D48', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
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
