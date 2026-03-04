import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../../api/client';
import { PremiumAlert } from '../../../../components/PremiumAlert';
import { PremiumHeader } from '../../../../components/PremiumHeader';
import { SkeletonLoader as Skeleton } from '../../../../components/SkeletonLoader';
import { useAccentColor } from '../../../../hooks/useAccentColor';

interface Servicio {
    id_servicio: number;
    codigo: string;
    tiempo: number;
    fecha_crea: string;
    precio_servicio: number;
    precio_habitacion?: number;
    total?: number;
    metodo_pago?: string;
    creado_por?: string;
    comision_usuario: number; // Nueva comisión específica del usuario
    habitacion: string;
    anfitriona: string;
    cliente: string;
    estado: number; // 0=Anulado, 1=Finalizado, 2=En Proceso, 3=Pausado, 4=Solicitud Anulación
    pago_estado?: number; // 0=Pagado, 1=Por pagar, 2=Anulado
}

export default function ServiciosScreen() {
    const { accentColor, isDark } = useAccentColor();
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'warning' as 'info' | 'success' | 'warning' | 'danger',
        onConfirm: () => { },
        showCancel: true
    });

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const ServicesSkeleton = () => (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Servicios" subtitle="Mi historial de atención" />
            <View style={{ margin: 16 }}>
                <Skeleton width="100%" height={120} borderRadius={16} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
                <Skeleton width="30%" height={35} borderRadius={20} />
                <Skeleton width="30%" height={35} borderRadius={20} />
                <Skeleton width="30%" height={35} borderRadius={20} />
            </View>
            <View style={{ padding: 16, gap: 10 }}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor, backgroundColor: cardBg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Skeleton width={120} height={20} />
                            <Skeleton width={80} height={20} borderRadius={10} />
                        </View>
                        <Skeleton height={15} width="60%" style={{ marginBottom: 10 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Skeleton width={100} height={25} />
                            <Skeleton width={60} height={25} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    const fetchData = useCallback(async () => {
        const isManual = refreshing;
        try {
            setError('');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
            const data = await apiClient('/servicios/user', { signal: controller.signal });
            clearTimeout(timeoutId);

            if (data.success) {
                setServicios(data.data || []);
                if (isManual) {
                    Toast.show({ type: 'success', text1: 'Sincronizado', text2: 'Datos actualizados desde el servidor' });
                }
            } else {
                setError(data.message || 'Error al cargar servicios');
                if (isManual) Toast.show({ type: 'error', text1: 'Error', text2: data.message });
            }
        } catch (err: any) {
            const msg = err.name === 'AbortError' ? 'Tiempo de espera agotado' : (err.message || 'Error de conexión');
            setError(msg);
            if (isManual) Toast.show({ type: 'error', text1: 'Fallo de conexión', text2: msg });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const handleAssistance = async (servicioId: number, roomName: string, type: string) => {
        const performRequest = async () => {
            try {
                const res = await apiClient('/notifications/assistance', {
                    method: 'POST',
                    body: JSON.stringify({
                        servicioId,
                        roomName,
                        type
                    })
                });

                if (res.success) {
                    Toast.show({ type: 'success', text1: 'Solicitud enviada', text2: `Se ha solicitado ${type} para la habitación ${roomName}` });
                }
            } catch (err) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar la solicitud' });
            }
        };

        if (type === 'Seguridad') {
            setAlertConfig({
                visible: true,
                title: 'Confirmar Alerta',
                message: `¿Estás seguro de enviar una ALERTA de seguridad para la habitación ${roomName}?`,
                type: 'danger',
                onConfirm: () => {
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                    performRequest();
                },
                showCancel: true
            });
        } else {
            performRequest();
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    // Filter logic
    const filteredData = servicios.filter((s) => {
        const estadoNum = Number(s.estado);
        if (filter === 'pendiente') return estadoNum === 2 || estadoNum === 3 || estadoNum === 4; // En proceso, Pausado o Solicitud
        if (filter === 'pagado') return estadoNum === 1; // Finalizado
        return true;
    });

    const pendientes = servicios.filter(s => {
        const estadoNum = Number(s.estado);
        return estadoNum === 2 || estadoNum === 3 || estadoNum === 4;
    });
    const pagados = servicios.filter(s => Number(s.estado) === 1);

    // El "Total a Cobrar" son las comisiones de servicios que aún están pendientes de pago a la anfitriona (pago_estado === 1) y el servicio está finalizado.
    const totalACobrar = pagados
        .filter(s => s.pago_estado === 1 || s.pago_estado === undefined)
        .reduce((sum, s) => sum + (s.comision_usuario || 0), 0);
    const totalEstimado = servicios.reduce((sum, s) => sum + (s.comision_usuario || 0), 0);

    const renderItem = ({ item, index }: { item: Servicio; index: number }) => {
        const isAnulado = Number(item.estado) === 0;
        const isFinalizado = Number(item.estado) === 1;
        const isProceso = Number(item.estado) === 2;
        const isPausado = Number(item.estado) === 3;
        const isSolicitud = Number(item.estado) === 4;

        const getStatusStyles = () => {
            if (isAnulado) return { bg: isDark ? '#450a0a' : '#fee2e2', text: isDark ? '#f87171' : '#991b1b', label: 'Anulado' };
            if (isFinalizado) return { bg: isDark ? '#065F46' : '#D1FAE5', text: isDark ? '#6EE7B7' : '#065F46', label: 'Finalizado' };
            if (isPausado) return { bg: isDark ? '#475569' : '#E2E8F0', text: isDark ? '#CBD5E1' : '#475569', label: 'Pausado' };
            if (isSolicitud) return { bg: isDark ? '#1e3a8a' : '#dbeafe', text: isDark ? '#60a5fa' : '#1e40af', label: 'Solicitud Anul.' };
            return { bg: isDark ? '#7C2D12' : '#FEF3C7', text: isDark ? '#FDBA74' : '#92400E', label: 'En proceso' };
        };

        const status = getStatusStyles();

        return (
            <MotiView
                from={{ opacity: 0, translateY: 50 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 100 }}
            >
                <Pressable
                    style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => {
                        setSelectedServicio(item);
                        setModalVisible(true);
                    }}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                            </View>
                            <Text style={[styles.habitacionText, { color: textPrimary }]}>{item.habitacion}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                        </View>
                        {isFinalizado && (
                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: item.pago_estado === 0 ? '#065F4620' : '#EF444420',
                                    marginLeft: 8,
                                    borderColor: item.pago_estado === 0 ? '#10B981' : '#EF4444',
                                    borderWidth: 1
                                }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: item.pago_estado === 0 ? '#10B981' : '#EF4444', fontSize: 10 }
                                ]}>
                                    {item.pago_estado === 0 ? 'COBRADO' : 'POR COBRAR'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                                <Text style={[styles.infoText, { color: textSecondary }]}>{formatDate(item.fecha_crea)}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Ionicons name="time-outline" size={14} color={textSecondary} />
                                <Text style={[styles.infoText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                            </View>
                        </View>

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Código:</Text>
                                <Text style={[styles.detailValue, { color: textPrimary }]}>{item.codigo}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Tiempo:</Text>
                                <Text style={[styles.detailValue, { color: textPrimary }]}>{item.tiempo} min</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Mi Comisión:</Text>
                                <Text style={[styles.priceValue, { color: accentColor }]}>${(item.comision_usuario || 0).toLocaleString()}</Text>
                            </View>
                        </View>

                        {isProceso && (
                            <View style={styles.assistanceContainer}>
                                <Text style={[styles.assistanceTitle, { color: textSecondary }]}>SILENT ASSISTANCE:</Text>
                                <View style={styles.assistanceGrid}>
                                    <Pressable
                                        style={[styles.assistanceBtn, { backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff' }]}
                                        onPress={() => handleAssistance(item.id_servicio, item.habitacion, 'Tragos')}
                                    >
                                        <Ionicons name="beer-outline" size={14} color={isDark ? '#818cf8' : '#3730a3'} />
                                        <Text style={[styles.assistanceBtnText, { color: isDark ? '#818cf8' : '#3730a3' }]}>Tragos</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.assistanceBtn, { backgroundColor: isDark ? '#064e3b' : '#d1fae5' }]}
                                        onPress={() => handleAssistance(item.id_servicio, item.habitacion, 'Limpieza/Hielo')}
                                    >
                                        <Ionicons name="sparkles-outline" size={14} color={isDark ? '#34d399' : '#065f46'} />
                                        <Text style={[styles.assistanceBtnText, { color: isDark ? '#34d399' : '#065f46' }]}>Servicio</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.assistanceBtn, { backgroundColor: isDark ? '#450a0a' : '#fee2e2' }]}
                                        onPress={() => handleAssistance(item.id_servicio, item.habitacion, 'Seguridad')}
                                    >
                                        <Ionicons name="alert-circle-outline" size={14} color={isDark ? '#f87171' : '#b91c1c'} />
                                        <Text style={[styles.assistanceBtnText, { color: isDark ? '#f87171' : '#b91c1c' }]}>ALERTA</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                </Pressable>
            </MotiView>
        );
    };

    if (loading) return <ServicesSkeleton />;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Servicios" subtitle="Mi historial de atención" />

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>TOTAL A COBRAR (Finalizados)</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalACobrar.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Proyectado: ${totalEstimado.toLocaleString()}</Text>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Servicios: {pagados.length}</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: filter === f ? accentColor : cardBg,
                                borderColor: filter === f ? accentColor : borderColor,
                            },
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: filter === f ? '#FFFFFF' : textSecondary },
                        ]}>
                            {f === 'all' ? `Todos (${servicios.length})` : f === 'pendiente' ? `En proceso (${pendientes.length})` : `Finalizados (${pagados.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={fetchData} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id_servicio.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="diamond-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron servicios</Text>
                    </View>
                }
            />

            {/* Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
                        {selectedServicio && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalles de Servicio</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedServicio.codigo}</Text>
                                    </View>
                                    <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color={textSecondary} />
                                    </Pressable>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                    <View style={styles.detailsGrid}>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{formatDate(selectedServicio.fecha_crea)}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>HORA</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{formatTime(selectedServicio.fecha_crea)}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedServicio.cliente || "Sin cliente registrado"}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedServicio.tiempo} min</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailsGrid}>
                                        <View style={[styles.gridItem, { width: '100%' }]}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>ANFITRIONA(S) ASIGNADA(S)</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedServicio.anfitriona}</Text>
                                        </View>
                                        <View style={[styles.gridItem, { width: '100%' }]}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedServicio.habitacion}</Text>
                                        </View>

                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>MÉTODO DE PAGO</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedServicio.metodo_pago ? selectedServicio.metodo_pago.toUpperCase() : "No def."}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>ATENDIDO POR</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedServicio.creado_por || "Garzón/Cajero"}</Text>
                                        </View>

                                    </View>

                                    <View style={[styles.summarySection, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor }]}>
                                        <View style={[styles.summaryRow, { marginTop: 4 }]}>
                                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Precio del Servicio</Text>
                                            <Text style={[styles.summaryVal, { color: textPrimary }]}>${(selectedServicio.precio_servicio || 0).toLocaleString()}</Text>
                                        </View>
                                        <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', paddingTop: 12 }]}>
                                            <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>ESTADO DE PAGO</Text>
                                            <Text style={[styles.totalValFinal, { color: selectedServicio.pago_estado === 0 ? '#10B981' : '#EF4444', fontSize: 18 }]}>
                                                {selectedServicio.pago_estado === 0 ? 'PAGADO ✓' : 'POR COBRAR ⚠'}
                                            </Text>
                                        </View>
                                        <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', paddingTop: 12 }]}>
                                            <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>ESTA ES MI COMISIÓN</Text>
                                            <Text style={[styles.totalValFinal, { color: accentColor, fontSize: 26 }]}>${(selectedServicio.comision_usuario || 0).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </ScrollView>

                                <Pressable
                                    style={[styles.modalCloseBtn, { backgroundColor: accentColor }]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
                onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                showCancel={alertConfig.showCancel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 15 },
    summaryCard: {
        marginHorizontal: 16, marginTop: 16, borderRadius: 16,
        padding: 20, alignItems: 'center', borderWidth: 1,
    },
    summaryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    summaryAmount: { fontSize: 34, fontWeight: '800', marginBottom: 8 },
    summaryDetails: { flexDirection: 'row', gap: 16 },
    summaryDetail: { fontSize: 13 },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 16,
        marginTop: 16, marginBottom: 8, gap: 8,
    },
    filterButton: {
        flex: 1, paddingVertical: 8, borderRadius: 9999,
        alignItems: 'center', borderWidth: 1,
    },
    filterText: { fontSize: 11, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    indexBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 12, fontWeight: '700' },
    habitacionText: { fontSize: 18, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardBody: {},
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(156, 163, 175, 0.1)', paddingBottom: 10 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 12 },
    detailsContainer: { gap: 6 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 13, fontWeight: '500' },
    detailValue: { fontSize: 13, fontWeight: '600' },
    priceValue: { fontSize: 16, fontWeight: '800' },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
    assistanceContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(156, 163, 175, 0.1)' },
    assistanceTitle: { fontSize: 10, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
    assistanceGrid: { flexDirection: 'row', gap: 8 },
    assistanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
    assistanceBtnText: { fontSize: 11, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: "90%", padding: 24, paddingBottom: 35 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    modalTitleText: { fontSize: 24, fontWeight: "900", marginBottom: 4 },
    modalSubText: { fontSize: 13, fontWeight: "600", opacity: 0.8 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(155,155,155,0.1)", justifyContent: "center", alignItems: "center" },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 16 },
    gridItem: { width: "45%", backgroundColor: "rgba(155,155,155,0.05)", padding: 16, borderRadius: 16, flexGrow: 1 },
    gridLabel: { fontSize: 11, fontWeight: "800", marginBottom: 6, letterSpacing: 0.5 },
    gridValue: { fontSize: 15, fontWeight: "700" },
    summarySection: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 10, marginBottom: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryVal: { fontSize: 16, fontWeight: '700' },
    totalLabelFinal: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    totalValFinal: { fontSize: 22, fontWeight: '900', color: '#10B981' },
    modalCloseBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 4, shadowColor: 'rgba(0,0,0,0.2)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    modalCloseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
