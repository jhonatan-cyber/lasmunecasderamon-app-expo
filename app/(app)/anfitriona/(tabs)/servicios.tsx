import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    Pressable
} from 'react-native';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useServicios, Servicio } from '@/hooks/useServicios';
import { ServiceCard } from '@/components/anfitriona/ServiceCard';
import { ServiceDetailModal } from '@/components/anfitriona/ServiceDetailModal';

import logger from '@/utils/logger';
export default function ServiciosScreen() {
    const { accentColor, isDark } = useAccentColor();
    const { servicios, loading, refreshing, error, onRefresh, handleAssistance, fetchData } = useServicios();
    
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado' | 'cobrado'>('all');
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

    const bg = isDark ? '#000000' : '#F9FAFB';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E5E7EB';

    const onConfirmAssistance = (servicioId: number, roomName: string, type: string) => {
        if (type === 'Seguridad') {
            setAlertConfig({
                visible: true,
                title: 'Confirmar Alerta',
                message: `¿Estás seguro de enviar una ALERTA de seguridad para la habitación ${roomName}?`,
                type: 'danger',
                onConfirm: () => {
                    handleAssistance(servicioId, roomName, type);
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                },
                showCancel: true
            });
        } else {
            handleAssistance(servicioId, roomName, type);
        }
    };

    const filteredData = servicios.filter((s) => s?.id_servicio).filter((s) => {
        const estadoNum = Number(s.estado);
        if (filter === 'pendiente') return [2, 3, 4].includes(estadoNum);
        if (filter === 'pagado') return estadoNum === 1;
        if (filter === 'cobrado') return estadoNum === 0;
        return true;
    });

    const finalizados = servicios.filter(s => s?.id_servicio && Number(s.estado) === 1);
    const cobrados = servicios.filter(s => s?.id_servicio && Number(s.estado) === 0);
    const pendientes = servicios.filter(s => s?.id_servicio && [2, 3, 4].includes(Number(s.estado)));
    const totalACobrar = finalizados.reduce((sum, s) => sum + (s.comision_usuario || 0), 0);
    const totalEstimado = servicios.reduce((sum, s) => sum + (s?.comision_usuario || 0), 0);

    const handlePressItem = (item: Servicio) => {
        setSelectedServicio(item);
        setModalVisible(true);
    };

    if (loading) return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Servicios" />
            <View style={{ padding: 16 }}><Skeleton width="100%" height={120} borderRadius={16} /></View>
            <View style={{ padding: 16, gap: 10 }}>{[1, 2].map(i => <Skeleton key={i} width="100%" height={100} borderRadius={16} />)}</View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Servicios" subtitle="Mi historial de atención" />
            
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>COMISIONES POR COBRAR</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalACobrar.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Historial: ${totalEstimado.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado', 'cobrado'] as const).map(f => (
                    <Pressable 
                        key={f} 
                        style={[styles.filterButton, { backgroundColor: filter === f ? accentColor : cardBg, borderColor: filter === f ? accentColor : borderColor }]} 
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                            {f === 'all' ? `Todos (${servicios.length})` 
                            : f === 'pendiente' ? `En Proceso (${pendientes.length})` 
                            : f === 'pagado' ? `Por Cobrar (${finalizados.length})`
                            : `Cobrados (${cobrados.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={() => fetchData(true)} style={styles.retryButton}>
                        <Text style={{ color: '#FFF' }}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList 
                data={filteredData} 
                keyExtractor={item => item?.id_servicio?.toString() || `fallback-${Math.random()}`} 
                renderItem={({ item, index }) => (
                    <ServiceCard 
                        item={item} 
                        index={index} 
                        onPress={handlePressItem} 
                        onAssistance={onConfirmAssistance} 
                    />
                )} 
                contentContainerStyle={styles.listContent} 
                showsVerticalScrollIndicator={false} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />} 
                ListEmptyComponent={<View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Ionicons name="diamond-outline" size={48} color={textSecondary} /><Text style={[styles.emptyText, { color: textSecondary }]}>No hay servicios aquí</Text></View>} 
            />

            <ServiceDetailModal 
                visible={modalVisible} 
                servicio={selectedServicio} 
                onClose={() => setModalVisible(false)}
                onEdit={() => {
                    
                    logger.info('Editar servicio', { servicioId: selectedServicio?.id_servicio });
                }}
            />

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
    summaryCard: { margin: 16, padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
    summaryAmount: { fontSize: 42, fontWeight: '900', marginBottom: 12, letterSpacing: -1 },
    summaryDetails: { flexDirection: 'row', gap: 12 },
    summaryDetail: { fontSize: 14, fontWeight: '600' },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
    filterButton: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    filterText: { fontSize: 12, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    errorCard: { margin: 16, padding: 20, backgroundColor: '#FEF2F2', borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
    errorText: { color: '#B91C1C', fontWeight: 'bold', marginBottom: 12 },
    retryButton: { backgroundColor: '#B91C1C', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
    emptyCard: { padding: 40, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyText: { marginTop: 16, fontSize: 16, fontWeight: '600' }
});
