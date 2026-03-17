import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '../api/client';
import { PremiumHeader } from '../components/PremiumHeader';
import { SkeletonLoader as Skeleton } from '../components/SkeletonLoader';
import { useAccentColor } from '../hooks/useAccentColor';

interface Anticipo {
    id_solicitud: number | string;
    usuario_id: number | string;
    fecha_crea: string;
    fecha_mod: string | null;
    monto: number;
    estado: 'pendiente' | 'confirmada' | 'rechazada';
    estado_texto: string;
    usuario?: string;
    motivo?: string;
    motivo_rechazo?: string;
}

export default function AnticiposScreen() {
    const { accentColor, isDark } = useAccentColor();
    const [solicitudes, setSolicitudes] = useState<Anticipo[]>([]);
    const [pagos, setPagos] = useState<any[]>([]);
    const [filter, setFilter] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos');
    const [viewMode, setViewMode] = useState<'solicitudes' | 'anticipos'>('solicitudes');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [monto, setMonto] = useState('');
    const [motivo, setMotivo] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);
    const [montoMaximo, setMontoMaximo] = useState(0);
    const [montoAsistencia, setMontoAsistencia] = useState(0);
    const [montoComisiones, setMontoComisiones] = useState(0);
    const [montoPropinas, setMontoPropinas] = useState(0);

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#111111' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E2E8F0';

    const fetchAnticipos = useCallback(async (isManual = false) => {
        try {
            setError('');
            const [solicitudesRes, pagosRes] = await Promise.all([
                apiClient('/anticipos/solicitudes'),
                apiClient('/anticipos/user'),
            ]);
            if (solicitudesRes.success) setSolicitudes(solicitudesRes.data || []);
            if (pagosRes.success) setPagos(pagosRes.data || []);
            if (isManual) Toast.show({ type: 'success', text1: 'Información', text2: 'Datos actualizados', visibilityTime: 2000 });
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
            if (isManual) Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar', visibilityTime: 3000 });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchAnticipos(); }, [fetchAnticipos]));

    const onRefresh = useCallback(() => { setRefreshing(true); fetchAnticipos(true); }, [fetchAnticipos]);

    const handleMontoChange = (text: string) => {
        const cleanNumber = text.replace(/[^0-9]/g, '');
        if (!cleanNumber) { setMonto(''); return; }
        setMonto(parseInt(cleanNumber).toLocaleString('de-DE'));
    };

    const solicitarAnticipo = async () => {
        const montoNum = parseFloat(monto.replace(/\./g, ''));
        if (!montoNum || montoNum <= 0) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Ingresa un monto válido', visibilityTime: 3000 });
            return;
        }
        if (montoNum > montoMaximo) {
            Toast.show({ type: 'error', text1: 'Error', text2: `El monto máximo es $${montoMaximo.toLocaleString()}`, visibilityTime: 3000 });
            return;
        }
        setSendingRequest(true);
        try {
            const response = await apiClient('/anticipos/solicitudes', {
                method: 'POST',
                body: JSON.stringify({ monto: montoNum, motivo }),
            });
            if (response.success) {
                Toast.show({ type: 'success', text1: 'Éxito', text2: 'Solicitud enviada correctamente', visibilityTime: 3000 });
                setModalVisible(false);
                setMonto('');
                setMotivo('');
                setTimeout(() => fetchAnticipos(), 1000);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: response.message || 'Error al enviar solicitud', visibilityTime: 3000 });
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Error de conexión', visibilityTime: 3000 });
        } finally {
            setSendingRequest(false);
        }
    };

    const openSolicitarModal = async () => {
        try {
            const response = await apiClient('/anticipos/maximo');
            if (response.success && response.data) {
                const { monto_maximo, monto_asistencia, monto_comisiones, monto_propinas, tiene_solicitud_pendiente } = response.data;
                if (tiene_solicitud_pendiente) {
                    Toast.show({ type: 'info', text1: 'Solicitud pendiente', text2: 'Ya tienes una solicitud de anticipo en espera', visibilityTime: 4000 });
                    return;
                }
                setMontoAsistencia(monto_asistencia || 0);
                setMontoComisiones(monto_comisiones || 0);
                setMontoPropinas(monto_propinas || 0);
                setMontoMaximo(monto_maximo || 0);
            } else {
                setMontoAsistencia(0); setMontoComisiones(0); setMontoPropinas(0); setMontoMaximo(0);
            }
        } catch {
            setMontoAsistencia(0); setMontoComisiones(0); setMontoPropinas(0); setMontoMaximo(0);
        }
        setModalVisible(true);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return `${date.getUTCDate()} ${date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' })} ${date.getUTCFullYear()}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        } catch { return ''; }
    };

    const formatCurrency = (amount: any) =>
        (Number(amount) || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const filteredData = viewMode === 'solicitudes'
        ? solicitudes.filter(s => {
            if (filter === 'pendiente') return s.estado === 'pendiente';
            if (filter === 'aprobado') return s.estado === 'confirmada';
            if (filter === 'rechazado') return s.estado === 'rechazada';
            return true;
        })
        : pagos;

    const totalPendiente = solicitudes.filter(a => a.estado === 'pendiente').reduce((sum, a) => sum + Number(a.monto || 0), 0);
    const totalEnCaja = solicitudes.filter(a => a.estado === 'confirmada').reduce((sum, a) => sum + Number(a.monto || 0), 0);
    const totalPagado = pagos.reduce((sum, a) => sum + Number(a.monto || 0), 0);

    const renderItem = ({ item, index }: { item: Anticipo; index: number }) => {
        const isPendiente = item.estado === 'pendiente';
        const isAprobada = item.estado === 'confirmada';
        const isRechazada = item.estado === 'rechazada';
        const isPagoReal = !!(item as any).id_anticipo;

        return (
            <MotiView
                from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 100 }}
            >
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                        <View style={[styles.statusBadge, {
                            backgroundColor: isPagoReal ? (isDark ? '#065F4630' : '#D1FAE5') :
                                isPendiente ? (isDark ? '#451A03' : '#FEF3C7') :
                                isAprobada ? (isDark ? '#065F46' : '#D1FAE5') :
                                (isDark ? '#7C2D12' : '#FEE2E2'),
                        }]}>
                            <Text style={[styles.statusText, {
                                color: isPagoReal ? (isDark ? '#10B981' : '#047857') :
                                    isPendiente ? '#F59E0B' :
                                    isAprobada ? (isDark ? '#6EE7B7' : '#065F46') :
                                    (isDark ? '#F87171' : '#B91C1C'),
                            }]}>
                                {isPagoReal ? ((item as any).estado_texto || 'PROCESADO') : isPendiente ? 'Pendiente' : isAprobada ? 'Aprobada' : 'Rechazada'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                            <Text style={[styles.timeText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                        </View>
                        <View style={styles.amountRow}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto</Text>
                            <Text style={[styles.amountValue, { color: isAprobada || isPagoReal ? accentColor : isPendiente ? '#F59E0B' : '#B91C1C' }]}>
                                ${formatCurrency(item.monto || 0)}
                            </Text>
                        </View>
                        {item.motivo ? <Text style={[styles.motivoText, { color: textSecondary }]}>📝 {item.motivo}</Text> : null}
                        {item.motivo_rechazo && isRechazada ? (
                            <View style={styles.rejectionBox}>
                                <Text style={styles.rejectionText}>❌ Motivo Rechazo: {item.motivo_rechazo}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </MotiView>
        );
    };

    if (loading) return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Anticipos" subtitle="Mis retiros de efectivo" />
            <View style={{ margin: 16 }}><Skeleton width="100%" height={140} borderRadius={16} /></View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
                <Skeleton width="30%" height={35} borderRadius={20} />
                <Skeleton width="30%" height={35} borderRadius={20} />
                <Skeleton width="30%" height={35} borderRadius={20} />
            </View>
            <View style={{ padding: 16, gap: 10 }}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor, backgroundColor: cardBg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Skeleton width={32} height={32} borderRadius={16} />
                            <Skeleton width={80} height={20} borderRadius={10} />
                        </View>
                        <Skeleton height={15} width="60%" style={{ marginBottom: 15 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Skeleton width={60} height={20} />
                            <Skeleton width={100} height={30} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Anticipos" subtitle="Mis retiros de efectivo" />

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                    {viewMode === 'solicitudes' ? 'SITUACIÓN DE SOLICITUDES' : 'ANTICIPOS ENTREGADOS'}
                </Text>
                <Text style={[styles.summaryAmount, { color: viewMode === 'solicitudes' ? '#F59E0B' : accentColor }]}>
                    ${viewMode === 'solicitudes' ? formatCurrency(totalPendiente + totalEnCaja) : formatCurrency(totalPagado)}
                </Text>
                <View style={styles.summaryDetails}>
                    {viewMode === 'solicitudes' ? (
                        <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                            Pendientes: ${formatCurrency(totalPendiente)} | Aprobadas: ${formatCurrency(totalEnCaja)}
                        </Text>
                    ) : (
                        <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                            Total retirado históricamente: ${formatCurrency(totalPagado)}
                        </Text>
                    )}
                </View>
            </View>

            {/* View Selector — separado del card con marginTop */}
            <View style={[styles.viewSelector, { marginTop: 16 }]}>
                <Pressable
                    onPress={() => setViewMode('solicitudes')}
                    style={[styles.viewOption, viewMode === 'solicitudes' && { backgroundColor: accentColor }]}
                >
                    <Text style={[styles.viewOptionText, { color: viewMode === 'solicitudes' ? '#FFF' : textSecondary }]}>
                        Solicitudes
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setViewMode('anticipos')}
                    style={[styles.viewOption, viewMode === 'anticipos' && { backgroundColor: accentColor }]}
                >
                    <Text style={[styles.viewOptionText, { color: viewMode === 'anticipos' ? '#FFF' : textSecondary }]}>
                        Anticipos
                    </Text>
                </Pressable>
            </View>

            {/* Filters */}
            {viewMode === 'solicitudes' && (
                <View style={styles.filterRow}>
                    {(['todos', 'pendiente', 'aprobado', 'rechazado'] as const).map((f) => (
                        <Pressable
                            key={f}
                            style={[styles.filterButton, {
                                backgroundColor: filter === f ? accentColor : cardBg,
                                borderColor: filter === f ? accentColor : borderColor,
                            }]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                                {f === 'todos' ? 'Todas' : f === 'pendiente' ? 'Pendientes' : f === 'aprobado' ? 'Aprobadas' : 'Rechazadas'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={() => fetchAnticipos()} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => (item.id_solicitud || (item as any).id_anticipo).toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="card-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron anticipos</Text>
                    </View>
                }
            />

            <Pressable style={[styles.fab, { backgroundColor: accentColor }]} onPress={openSolicitarModal}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>

            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Solicitar Anticipo</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={textSecondary} />
                            </Pressable>
                        </View>

                        <View style={[styles.disponibleCard, { backgroundColor: cardBg, borderColor }]}>
                            <Text style={[styles.disponibleLabel, { color: textSecondary }]}>TOTAL POR COBRAR</Text>
                            <Text style={[styles.disponibleMonto, { color: accentColor }]}>${formatCurrency(montoMaximo)}</Text>
                            <View style={styles.desgloseRow}>
                                {[
                                    { label: 'Asistencia', value: montoAsistencia },
                                    { label: 'Comisiones', value: montoComisiones },
                                    { label: 'Propinas', value: montoPropinas },
                                ].map(({ label, value }) => (
                                    <View key={label} style={styles.desgloseItem}>
                                        <Text style={[styles.desgloseLabel, { color: textSecondary }]}>{label}</Text>
                                        <Text style={[styles.desgloseValue, { color: textPrimary }]}>${formatCurrency(value)}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor }]}
                            placeholder={`Monto a solicitar (máx. $${formatCurrency(montoMaximo)})`}
                            placeholderTextColor={textSecondary}
                            keyboardType="numeric"
                            value={monto}
                            onChangeText={handleMontoChange}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: cardBg, color: textPrimary, borderColor }]}
                            placeholder="Motivo (opcional)"
                            placeholderTextColor={textSecondary}
                            multiline
                            numberOfLines={3}
                            value={motivo}
                            onChangeText={setMotivo}
                        />

                        <Pressable
                            style={[styles.submitButton, { backgroundColor: accentColor }, (sendingRequest || montoMaximo === 0) && { opacity: 0.7 }]}
                            onPress={solicitarAnticipo}
                            disabled={sendingRequest || montoMaximo === 0}
                        >
                            {sendingRequest ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {montoMaximo === 0 ? 'Sin monto disponible' : 'Enviar Solicitud'}
                                </Text>
                            )}
                        </Pressable>

                        <Text style={[styles.modalFooter, { color: textSecondary }]}>
                            La solicitud será enviada al administrador para su aprobación
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    summaryCard: {
        marginHorizontal: 16, marginTop: 16, borderRadius: 16,
        padding: 20, alignItems: 'center', borderWidth: 1,
    },
    summaryLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    summaryAmount: { fontSize: 38, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
    summaryDetails: { flexDirection: 'row', gap: 16 },
    summaryDetail: { fontSize: 13 },
    viewSelector: {
        flexDirection: 'row', backgroundColor: '#80808020',
        marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 16,
    },
    viewOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    viewOptionText: { fontSize: 13, fontWeight: '700' },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 16,
        marginBottom: 8, gap: 8,
    },
    filterButton: {
        flex: 1, paddingVertical: 8, borderRadius: 9999,
        alignItems: 'center', borderWidth: 1,
    },
    filterText: { fontSize: 11, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    indexBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 14, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    statusText: { fontSize: 12, fontWeight: '600' },
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    dateText: { fontSize: 14 },
    timeText: { fontSize: 13, marginLeft: 6 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountLabel: { fontSize: 14, fontWeight: '600' },
    amountValue: { fontSize: 22, fontWeight: '800' },
    motivoText: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
    rejectionBox: { marginTop: 10, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
    rejectionText: { fontSize: 12, color: '#991B1B' },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
    fab: {
        position: 'absolute', bottom: 24, right: 24,
        width: 60, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    disponibleCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
    disponibleLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    disponibleMonto: { fontSize: 32, fontWeight: '900', marginBottom: 12 },
    desgloseRow: { flexDirection: 'row', justifyContent: 'space-between' },
    desgloseItem: { alignItems: 'center' },
    desgloseLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
    desgloseValue: { fontSize: 14, fontWeight: '700' },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
    textArea: { height: 80, textAlignVertical: 'top' },
    submitButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    modalFooter: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
