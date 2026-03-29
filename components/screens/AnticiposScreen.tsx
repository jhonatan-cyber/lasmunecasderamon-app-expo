import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { AdvanceCard } from '@/components/ui/AdvanceCard';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAnticipos, Anticipo } from '@/hooks/useAnticipos';

export default function AnticiposScreen() {
    const { accentColor, isDark } = useAccentColor();
    const {
        solicitudes, pagos, loading, refreshing, error,
        montoMaximo, montoAsistencia, montoComisiones, montoPropinas,
        fetchMaximo, solicitarAnticipo, onRefresh
    } = useAnticipos();

    const [filter, setFilter] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos');
    const [viewMode, setViewMode] = useState<'solicitudes' | 'anticipos'>('solicitudes');
    const [modalVisible, setModalVisible] = useState(false);
    const [monto, setMonto] = useState('');
    const [motivo, setMotivo] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#111111' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E2E8F0';
    const canRequestAdvance = montoMaximo > 0;

    const normalizeEstado = (estado: Anticipo['estado'] | number | string) => {
        if (estado === 2 || estado === '2' || estado === 'pendiente') return 'pendiente';
        if (estado === 1 || estado === '1' || estado === 'confirmada' || estado === 'aprobado' || estado === 'aprobada') return 'confirmada';
        if (estado === 0 || estado === '0' || estado === 'rechazada' || estado === 'rechazado') return 'rechazada';
        return String(estado ?? '');
    };

    const handleMontoChange = (text: string) => {
        const cleanNumber = text.replace(/[^0-9]/g, '');
        if (!cleanNumber) {
            setMonto('');
            return;
        }
        setMonto(parseInt(cleanNumber, 10).toLocaleString('de-DE'));
    };

    const handleSolicitar = async () => {
        const montoNum = parseFloat(monto.replace(/\./g, ''));
        if (!montoNum || montoNum <= 0) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Ingresa un monto válido' });
            return;
        }
        if (montoNum > montoMaximo) {
            Toast.show({ type: 'error', text1: 'Error', text2: `El monto máximo es $${montoMaximo.toLocaleString()}` });
            return;
        }
        setSendingRequest(true);
        const success = await solicitarAnticipo(montoNum, motivo);
        if (success) {
            setModalVisible(false);
            setMonto('');
            setMotivo('');
        }
        setSendingRequest(false);
    };

    const openSolicitarModal = async () => {
        const data = await fetchMaximo();
        if (data?.tiene_solicitud_pendiente) {
            Toast.show({ type: 'info', text1: 'Solicitud pendiente', text2: 'Ya tienes una solicitud de anticipo en espera' });
            return;
        }
        setModalVisible(true);
    };

    const formatCurrency = (amount: any) => (Number(amount) || 0).toLocaleString('de-DE');

    const filteredData = viewMode === 'solicitudes'
        ? solicitudes.filter((s) => {
            const estado = normalizeEstado(s.estado);
            if (filter === 'pendiente') return estado === 'pendiente';
            if (filter === 'aprobado') return estado === 'confirmada';
            if (filter === 'rechazado') return estado === 'rechazada';
            return true;
        })
        : pagos.filter((p) => {
            const estado = normalizeEstado((p as any).estado);
            return estado === 'confirmada' || estado === 'rechazada';
        });

    const totalPendiente = solicitudes.filter((a) => normalizeEstado(a.estado) === 'pendiente').reduce((sum, a) => sum + Number(a.monto), 0);
    const totalEnCaja = solicitudes.filter((a) => normalizeEstado(a.estado) === 'confirmada').reduce((sum, a) => sum + Number(a.monto), 0);
    const totalPagado = pagos.reduce((sum, a) => sum + Number(a.monto), 0);

    const renderItem = ({ item, index }: { item: Anticipo; index: number }) => (
        <AdvanceCard
            item={item}
            index={index}
            showIndexBadge={true}
            compactDate={true}
            viewMode={viewMode}
            normalizeEstado={normalizeEstado}
        />
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bg }]}>
                <PremiumHeader title="Anticipos" />
                <View style={{ margin: 16 }}>
                    <SkeletonLoader width="100%" height={140} borderRadius={16} />
                </View>
                <View style={{ padding: 16, gap: 10 }}>
                    {[1, 2].map((i) => <SkeletonLoader key={i} width="100%" height={100} borderRadius={16} />)}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Anticipos" subtitle="Mis retiros de efectivo" />
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 16 }}>
                <Pressable style={[styles.mainTab, viewMode === 'solicitudes' && { backgroundColor: accentColor, borderColor: accentColor }, { backgroundColor: viewMode !== 'solicitudes' ? cardBg : accentColor }]} onPress={() => setViewMode('solicitudes')}>
                    <Ionicons name="document-text-outline" size={18} color={viewMode === 'solicitudes' ? '#FFFFFF' : textSecondary} />
                    <Text style={[styles.mainTabText, { color: viewMode === 'solicitudes' ? '#FFFFFF' : textSecondary }]}>Solicitudes</Text>
                </Pressable>
                <Pressable style={[styles.mainTab, viewMode === 'anticipos' && { backgroundColor: accentColor, borderColor: accentColor }, { backgroundColor: viewMode !== 'anticipos' ? cardBg : accentColor }]} onPress={() => setViewMode('anticipos')}>
                    <Ionicons name="cash-outline" size={18} color={viewMode === 'anticipos' ? '#FFFFFF' : textSecondary} />
                    <Text style={[styles.mainTabText, { color: viewMode === 'anticipos' ? '#FFFFFF' : textSecondary }]}>Historial</Text>
                </Pressable>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>{viewMode === 'solicitudes' ? 'SITUACIÓN DE SOLICITUDES' : 'ANTICIPOS ENTREGADOS'}</Text>
                <Text style={[styles.summaryAmount, { color: viewMode === 'solicitudes' ? '#F59E0B' : accentColor }]}>${viewMode === 'solicitudes' ? formatCurrency(totalPendiente) : formatCurrency(totalPagado)}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        {viewMode === 'solicitudes' ? `Solicitudes: $${formatCurrency(totalPendiente)} | Aprobadas: $${formatCurrency(totalEnCaja)}` : `Total retirado históricamente: $${formatCurrency(totalPagado)}`}
                    </Text>
                </View>
            </View>

            {viewMode === 'solicitudes' && (
                <View style={styles.filterRow}>
                    {(['todos', 'pendiente', 'aprobado', 'rechazado'] as const).map((f) => (
                        <Pressable key={f} style={[styles.filterButton, { backgroundColor: filter === f ? accentColor : cardBg, borderColor: filter === f ? accentColor : borderColor }]} onPress={() => setFilter(f)}>
                            <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                                {f === 'pendiente' ? 'Solicitados' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => (item.id_solicitud || (item as any).id_anticipo).toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListEmptyComponent={<View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Ionicons name="card-outline" size={48} color={textSecondary} /><Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron anticipos</Text></View>}
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
                                {[{ label: 'Asistencia', value: montoAsistencia }, { label: 'Comisiones', value: montoComisiones }, { label: 'Propinas', value: montoPropinas }].map(({ label, value }) => (
                                    <View key={label} style={styles.desgloseItem}>
                                        <Text style={[styles.desgloseLabel, { color: textSecondary }]}>{label}</Text>
                                        <Text style={[styles.desgloseValue, { color: textPrimary }]}>${formatCurrency(value)}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor }, !canRequestAdvance && styles.inputDisabled]}
                            placeholder={`Monto (máx. $${formatCurrency(montoMaximo)})`}
                            placeholderTextColor={textSecondary}
                            keyboardType="numeric"
                            value={monto}
                            onChangeText={handleMontoChange}
                            editable={canRequestAdvance}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: cardBg, color: textPrimary, borderColor }, !canRequestAdvance && styles.inputDisabled]}
                            placeholder="Motivo (opcional)"
                            placeholderTextColor={textSecondary}
                            multiline
                            numberOfLines={3}
                            value={motivo}
                            onChangeText={setMotivo}
                            editable={canRequestAdvance}
                        />
                        <Pressable
                            style={[styles.submitButton, { backgroundColor: accentColor }, (sendingRequest || !canRequestAdvance) && { opacity: 0.7 }]}
                            onPress={handleSolicitar}
                            disabled={sendingRequest || !canRequestAdvance}
                        >
                            {sendingRequest ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>{!canRequestAdvance ? 'Sin monto disponible' : 'Enviar Solicitud'}</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
    summaryLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    summaryAmount: { fontSize: 38, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
    summaryDetails: { flexDirection: 'row', gap: 16 },
    summaryDetail: { fontSize: 13 },
    mainTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 8, marginHorizontal: 4 },
    mainTabText: { fontSize: 13, fontWeight: '700' },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
    filterButton: { flex: 1, paddingVertical: 8, borderRadius: 9999, alignItems: 'center', borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
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
    inputDisabled: { opacity: 0.45 },
    textArea: { height: 80, textAlignVertical: 'top' },
    submitButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
