import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { PremiumAlert } from '../../../components/PremiumAlert';
import { Skeleton } from '../../../components/ui/Skeleton';

const statusColors: Record<number, string> = {
    1: '#10B981', // Pendiente (Green)
    0: '#EF4444', // Cobrado (Red)
};

const statusLabels: Record<number, string> = {
    1: 'Pendiente',
    0: 'Cobrado',
};

export default function CuentasScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cuentas, setCuentas] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const dataRef = useRef<string>('');

    const [selectedCuenta, setSelectedCuenta] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [activeCuenta, setActiveCuenta] = useState<any>(null);

    const params = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState<'historial' | 'pendientes'>(
        (params.tab as any) === 'pendientes' ? 'pendientes' : 'historial',
    );

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000,
        });
    };

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const CuentasSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <View style={[styles.header, { paddingTop: insets.top + 10, height: 160 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Skeleton width={150} height={30} />
                    <Skeleton width={44} height={44} borderRadius={22} />
                </View>
                <Skeleton width="60%" height={24} />
            </View>
            <View style={{ padding: 16 }}>
                <Skeleton height={140} borderRadius={24} style={{ marginBottom: 20 }} />
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
                    <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
                </View>
                {[1, 2, 3].map((i) => (
                    <View
                        key={i}
                        style={{
                            padding: 16,
                            borderRadius: 20,
                            marginBottom: 14,
                            backgroundColor: cardBg,
                            borderWidth: 1,
                            borderColor,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Skeleton width={100} height={20} />
                            <Skeleton width={80} height={20} borderRadius={10} />
                        </View>
                        <Skeleton width="100%" height={60} borderRadius={12} />
                    </View>
                ))}
            </View>
        </View>
    );

    const fetchCuentas = useCallback(async (isManual = false) => {
        try {
            const [resCuentas, resResumen] = await Promise.all([
                apiClient('/cuentas?limit=50').catch(() => ({ success: false, data: [] })),
                apiClient('/cuentas?tipo=resumen').catch(() => ({ success: false, data: null })),
            ]);

            const newData = { cuentas: resCuentas.data, resumen: resResumen.data };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (resCuentas.success) {
                setCuentas(resCuentas.data || []);
            }
            if (resResumen.success) {
                setResumen(resResumen.data);
            }

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000,
                });
            }
        } catch (error) {
            console.error('Error fetching cuentas:', error);
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar',
                    visibilityTime: 3000,
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCuentas();
    }, [fetchCuentas]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCuentas(true);
    }, [fetchCuentas]);

    const handleCobrarCuenta = async () => {
        if (!activeCuenta) return;
        setActionSheetVisible(false);

        setAlertConfig({
            visible: true,
            title: 'Cobrar Cuenta',
            message: `¿Deseas cobrar la cuenta ${activeCuenta.codigo}?\nTotal: $${activeCuenta.total.toLocaleString()}`,
            type: 'warning',
            onConfirm: async () => {
                try {
                    const response = await apiClient(`/cuentas/${activeCuenta.id_cuenta}/cobrar`, {
                        method: 'POST',
                    });

                    if (response.success) {
                        showToast('Cuenta Cobrada', 'La cuenta ha sido cobrada exitosamente', 'success');
                        fetchCuentas();
                    } else {
                        showToast('Error', response.message || 'No se pudo cobrar la cuenta');
                    }
                } catch (err: any) {
                    showToast('Error', 'Error al procesar el cobro');
                }
            },
        });
    };

    const handleVerDetalles = async (cuenta: any) => {
        setLoadingDetail(true);
        setModalVisible(true);
        try {
            const response = await apiClient(`/cuentas/${cuenta.id_cuenta}`);
            if (response.success) {
                setSelectedCuenta(response.data);
            } else {
                showToast('Error', 'No se pudieron cargar los detalles');
                setModalVisible(false);
            }
        } catch (err) {
            showToast('Error', 'Error al cargar detalles');
            setModalVisible(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const renderCuentaCard = ({ item }: { item: any }) => {
        const productCount = item.detalles
            ? item.detalles.reduce((acc: number, d: any) => acc + d.cantidad, 0)
            : 0;

        return (
            <Pressable
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                onPress={() => handleVerDetalles(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardCode, { color: '#10B981' }]}>{item.codigo}</Text>
                        <Text style={[styles.cardClient, { color: textPrimary }]}>
                            {item.cliente_nombre || 'Cliente sin nombre'}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.cardTotal, { color: '#10B981' }]}>
                            ${item.total.toLocaleString()}
                        </Text>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: statusColors[item.estado] + '20' },
                            ]}
                        >
                            <Text style={[styles.statusText, { color: statusColors[item.estado] }]}>
                                {statusLabels[item.estado]}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardDetails}>
                    {item.habitacion_numero && (
                        <View style={styles.detailRow}>
                            <Ionicons name="bed-outline" size={16} color={textSecondary} />
                            <Text style={[styles.detailText, { color: textSecondary }]}>
                                {item.habitacion_numero}
                            </Text>
                        </View>
                    )}
                    <View style={styles.detailRow}>
                        <Ionicons name="cart-outline" size={16} color={textSecondary} />
                        <Text style={[styles.detailText, { color: textSecondary }]}>
                            {productCount} producto{productCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                        <Text style={[styles.detailText, { color: textSecondary }]}>
                            {new Date(item.fecha_crea).toLocaleDateString('es-ES')}
                        </Text>
                    </View>
                </View>

                {item.estado === 1 && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            setActiveCuenta(item);
                            setActionSheetVisible(true);
                        }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
                    </Pressable>
                )}
            </Pressable>
        );
    };

    if (loading) {
        return <CuentasSkeleton />;
    }

    const pendientesCount = cuentas.filter((c) => c.estado === 1).length;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: isDark ? '#111827' : '#FFFFFF',
                        paddingTop: insets.top + 10,
                        paddingBottom: 15,
                    },
                ]}
            >
                <View style={styles.headerTop}>
                    <Pressable
                        onPress={() => router.replace('/cajero/(tabs)' as any)}
                        style={styles.backBtn}
                    >
                        <Ionicons name="arrow-back" size={24} color={textPrimary} />
                    </Pressable>
                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginLeft: 10,
                        }}
                    >
                        <View>
                            <Text style={[styles.headerTitle, { color: textPrimary }]}>
                                Cuentas
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                                Historial de transacciones
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <Pressable
                                onPress={() => router.push('/cajero/nueva-cuenta')}
                                style={styles.plusBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Nueva Cuenta"
                            >
                                <Ionicons name="add" size={20} color="#FFFFFF" />
                                <Text style={styles.plusBtnText}>Nuevo</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
                <View style={[styles.tabContainer, { borderColor }]}>
                    <Pressable
                        style={[
                            styles.tab,
                            activeTab === 'historial' && { backgroundColor: '#10B981' },
                        ]}
                        onPress={() => setActiveTab('historial')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'historial'
                                    ? { color: '#FFF' }
                                    : { color: textSecondary },
                            ]}
                        >
                            Listado de Cuentas
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.tab,
                            activeTab === 'pendientes' && { backgroundColor: '#10B981' },
                        ]}
                        onPress={() => setActiveTab('pendientes')}
                    >
                        <View style={styles.tabWithBadge}>
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'pendientes'
                                        ? { color: '#FFF' }
                                        : { color: textSecondary },
                                ]}
                            >
                                Cuentas Pendientes
                            </Text>
                            {pendientesCount > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>
                                        {pendientesCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                </View>
            </View>



            <FlatList
                data={
                    activeTab === 'historial'
                        ? cuentas
                        : cuentas.filter((c) => c.estado === 1)
                }
                renderItem={renderCuentaCard}
                keyExtractor={(item) => item.id_cuenta.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#10B981"
                        colors={['#10B981']}
                    />
                }
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { borderColor }]}>
                        <Ionicons name="receipt-outline" size={64} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textPrimary }]}>
                            No hay cuentas registradas
                        </Text>
                        <Text style={[styles.emptySub, { color: textSecondary }]}>
                            Las cuentas aparecerán conforme se registren.
                        </Text>
                    </View>
                }
            />

            {/* Modal de Detalles */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Detalles de Cuenta</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>

                        {loadingDetail ? (
                            <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 40 }} />
                        ) : selectedCuenta ? (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={[styles.modalSection, { borderBottomColor: borderColor }]}>
                                    <Text style={[styles.modalSectionTitle, { color: textSecondary }]}>
                                        INFORMACIÓN GENERAL
                                    </Text>
                                    <View style={styles.modalRow}>
                                        <Text style={[styles.modalLabel, { color: textSecondary }]}>Código:</Text>
                                        <Text style={[styles.modalValue, { color: textPrimary }]}>
                                            {selectedCuenta.codigo}
                                        </Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={[styles.modalLabel, { color: textSecondary }]}>Cliente:</Text>
                                        <Text style={[styles.modalValue, { color: textPrimary }]}>
                                            {selectedCuenta.cliente_nombre}
                                        </Text>
                                    </View>
                                    {selectedCuenta.habitacion_numero && (
                                        <View style={styles.modalRow}>
                                            <Text style={[styles.modalLabel, { color: textSecondary }]}>Habitación:</Text>
                                            <Text style={[styles.modalValue, { color: textPrimary }]}>
                                                {selectedCuenta.habitacion_numero}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.modalRow}>
                                        <Text style={[styles.modalLabel, { color: textSecondary }]}>Estado:</Text>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                { backgroundColor: statusColors[selectedCuenta.estado] + '20' },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusText,
                                                    { color: statusColors[selectedCuenta.estado] },
                                                ]}
                                            >
                                                {statusLabels[selectedCuenta.estado]}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {selectedCuenta.detalles && selectedCuenta.detalles.length > 0 && (
                                    <View style={[styles.modalSection, { borderBottomColor: borderColor }]}>
                                        <Text style={[styles.modalSectionTitle, { color: textSecondary }]}>
                                            PRODUCTOS
                                        </Text>
                                        {selectedCuenta.detalles.map((detalle: any, index: number) => (
                                            <View key={index} style={[styles.productoItem, { borderBottomColor: borderColor }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.productoNombre, { color: textPrimary }]}>
                                                        {detalle.producto_nombre}
                                                    </Text>
                                                    <Text style={[styles.productoDetalle, { color: textSecondary }]}>
                                                        ${detalle.precio.toLocaleString()} x {detalle.cantidad}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.productoTotal, { color: textPrimary }]}>
                                                    ${detalle.sub_total.toLocaleString()}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.modalSection}>
                                    <View style={styles.modalRow}>
                                        <Text style={[styles.modalLabel, { color: textSecondary }]}>Subtotal:</Text>
                                        <Text style={[styles.modalValue, { color: textPrimary }]}>
                                            ${selectedCuenta.sub_total.toLocaleString()}
                                        </Text>
                                    </View>
                                    {selectedCuenta.total_comision > 0 && (
                                        <View style={styles.modalRow}>
                                            <Text style={[styles.modalLabel, { color: textSecondary }]}>Comisión:</Text>
                                            <Text style={[styles.modalValue, { color: textPrimary }]}>
                                                ${selectedCuenta.total_comision.toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.modalRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }]}>
                                        <Text style={[styles.modalLabel, { color: textPrimary, fontWeight: '800' }]}>
                                            TOTAL:
                                        </Text>
                                        <Text style={[styles.modalValue, { color: '#10B981', fontWeight: '900', fontSize: 20 }]}>
                                            ${selectedCuenta.total.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>

            {/* Action Sheet */}
            <Modal
                visible={actionSheetVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActionSheetVisible(false)}
            >
                <Pressable style={styles.actionSheetOverlay} onPress={() => setActionSheetVisible(false)}>
                    <View style={[styles.actionSheet, { backgroundColor: cardBg }]}>
                        <View style={[styles.actionSheetHandle, { backgroundColor: borderColor }]} />
                        <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>
                            Cuenta {activeCuenta?.codigo}
                        </Text>

                        <Pressable
                            style={[
                                styles.actionItem,
                                { borderBottomColor: borderColor },
                                styles.actionItemPressed,
                            ]}
                            onPress={handleCobrarCuenta}
                        >
                            <View style={[styles.actionIconContainer, { backgroundColor: '#10B981' + '20' }]}>
                                <Ionicons name="cash-outline" size={24} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.actionItemTitle, { color: textPrimary }]}>Cobrar Cuenta</Text>
                                <Text style={[styles.actionItemSubtitle, { color: textSecondary }]}>
                                    Marcar como cobrada
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </Pressable>

                        <Pressable
                            style={[styles.cancelButton, { backgroundColor: borderColor }]}
                            onPress={() => setActionSheetVisible(false)}
                        >
                            <Text style={[styles.cancelButtonText, { color: textPrimary }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Alert */}
            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                onConfirm={alertConfig.onConfirm}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#10B981',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        gap: 4,
    },
    plusBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    headerSubtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8 },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(155,155,155,0.05)',
        borderRadius: 16,
        padding: 4,
        marginTop: 15,
        borderWidth: 1,
    },
    tab: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    tabWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    tabBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    listContainer: { padding: 16, paddingBottom: 100 },
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardCode: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    cardClient: { fontSize: 14, fontWeight: '600' },
    cardTotal: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: { fontSize: 11, fontWeight: '800' },
    cardDetails: { gap: 8, marginTop: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, fontWeight: '500' },
    actionButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCard: {
        borderRadius: 32,
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginTop: 40,
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.7,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    modalBody: { padding: 20 },
    modalSection: {
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalSectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 12,
    },
    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalLabel: { fontSize: 14, fontWeight: '600' },
    modalValue: { fontSize: 14, fontWeight: '700' },
    productoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    productoNombre: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
    productoDetalle: { fontSize: 12 },
    productoTotal: { fontSize: 16, fontWeight: '800' },
    actionSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        padding: 20,
    },
    actionSheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    actionSheetTitle: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 20,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderRadius: 12,
        marginBottom: 8,
    },
    actionItemPressed: { opacity: 0.7 },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionItemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    actionItemSubtitle: { fontSize: 13 },
    cancelButton: {
        marginHorizontal: 16,
        marginTop: 16,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    cancelButtonText: { fontSize: 16, fontWeight: '700' },
});
