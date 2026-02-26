import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { apiClient } from '../../../api/client';

// Utils for status colors and labels
const statusColors: Record<number, string> = {
    1: '#10B981', // Completado (Green)
    2: '#3B82F6', // En proceso (Blue)
    3: '#F59E0B', // Pdte. Anulación (Yellow)
    0: '#EF4444', // Anulado (Red)
};

const statusLabels: Record<number, string> = {
    1: 'Completado',
    2: 'En proceso',
    3: 'Pdte. Anulación',
    0: 'Anulado',
};

const payMethodIcons: Record<string, any> = {
    efectivo: 'cash-outline',
    tarjeta: 'card-outline',
    transferencia: 'swap-horizontal-outline',
};

export default function VentasScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ventas, setVentas] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);

    const [selectedVenta, setSelectedVenta] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Action Sheet state
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [activeVenta, setActiveVenta] = useState<any>(null);

    // Toast modal state
    const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' }>({
        visible: false, title: '', message: '', type: 'success'
    });

    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        setToast({ visible: true, title, message, type });
    };

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchVentas = useCallback(async () => {
        try {
            const [resSales, resResumen] = await Promise.all([
                apiClient('/sales?limit=50').catch(() => ({ success: false, data: [] })),
                apiClient('/sales?tipo=resumen').catch(() => ({ success: false, data: null }))
            ]);

            if (resSales.success) {
                setVentas(resSales.data || []);
            }
            if (resResumen.success) {
                setResumen(resResumen.data);
            }
        } catch (error) {
            console.error('Error fetching ventas:', error);
            showToast('Error', 'No se pudieron cargar las ventas.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchVentas();
    }, [fetchVentas]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchVentas();
    };

    const handleOpenActionSheet = (venta: any) => {
        setActiveVenta(venta);
        setActionSheetVisible(true);
    };

    const handleVerDetalles = async (id: number) => {
        setActionSheetVisible(false);
        setLoadingDetail(true);
        setModalVisible(true);
        try {
            const res = await apiClient(`/ventas/${id}`);
            if (res && !res.error) {
                setSelectedVenta(res);
            } else {
                showToast('Error', 'No se pudo obtener el detalle de la venta');
                setModalVisible(false);
            }
        } catch (error) {
            showToast('Error', 'Error de conexión al cargar detalles');
            setModalVisible(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleAnularVenta = async () => {
        if (!activeVenta) return;
        setActionSheetVisible(false);

        try {
            const res = await apiClient(`/ventas/${activeVenta.id_venta}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: 3 }) // 3 = Pdte. Anulación
            });

            if (res.success) {
                showToast('Solicitud Enviada', 'La anulación ha sido solicitada correctamente.', 'success');
                fetchVentas();
            } else {
                showToast('Error', res.message || 'No se pudo solicitar la anulación');
            }
        } catch (error) {
            showToast('Error', 'Error al procesar la solicitud de anulación');
        }
    };

    const renderVentaCard = ({ item }: { item: any }) => {
        const productCount = item.detalles ? item.detalles.reduce((acc: number, d: any) => acc + d.cantidad, 0) : 0;
        const statusColor = statusColors[item.estado] || '#6B7280';

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: cardBg, borderColor, borderLeftColor: statusColor },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => handleOpenActionSheet(item)}
            >
                <View style={styles.cardMainRow}>
                    {/* Left Info Section */}
                    <View style={styles.cardLeftContent}>
                        <View style={styles.cardTopActions}>
                            <Text style={[styles.cardCode, { color: textPrimary }]}>{item.codigo}</Text>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: `${statusColor}15` }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusTextSmall, { color: statusColor }]}>
                                    {statusLabels[item.estado] || 'Desconocido'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cardDetailsList}>
                            <View style={styles.detailItemRow}>
                                <Ionicons name="person-outline" size={14} color={textSecondary} style={styles.rowIcon} />
                                <Text style={[styles.detailValue, { color: textPrimary }]}>
                                    {item.cliente_nombre || 'Sin cliente registrado'}
                                </Text>
                            </View>

                            <View style={styles.detailItemRow}>
                                <Ionicons name="business-outline" size={14} color={textSecondary} style={styles.rowIcon} />
                                <Text style={[styles.detailValue, { color: textPrimary }]}>
                                    {item.habitacion_nombre || 'Barra / General'}
                                </Text>
                            </View>

                            <View style={styles.detailItemRow}>
                                <Ionicons name="people-outline" size={14} color={textSecondary} style={styles.rowIcon} />
                                {item.usuarios_nicks ? (
                                    <View style={[styles.hostessPill, { backgroundColor: '#8B5CF610' }]}>
                                        <Text style={[styles.hostessText, { color: '#8B5CF6' }]} numberOfLines={1}>
                                            {item.usuarios_nicks}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.detailValue, { color: textSecondary, fontStyle: 'italic' }]}>
                                        Venta en barra
                                    </Text>
                                )}
                            </View>

                            <View style={styles.detailItemRow}>
                                <Ionicons name="time-outline" size={14} color={textSecondary} style={styles.rowIcon} />
                                <Text style={[styles.detailValue, { color: textSecondary, fontSize: 12 }]}>
                                    {new Date(item.fecha_crea).toLocaleString('es-CL', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Info Section */}
                    <View style={styles.cardRightContent}>
                        <View style={styles.methodBadgeContainer}>
                            <Ionicons name={payMethodIcons[item.metodo_pago] || 'wallet-outline'} size={14} color={textSecondary} />
                            <Text style={[styles.methodText, { color: textSecondary }]}>
                                {item.metodo_pago.toUpperCase()}
                            </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.cardTotalBig, { color: textPrimary }]}>
                                ${item.total.toLocaleString()}
                            </Text>
                            <View style={styles.subInfoRow}>
                                <Text style={[styles.cardSubCount, { color: textSecondary }]}>
                                    {productCount} items
                                </Text>
                                {item.propina > 0 && (
                                    <>
                                        <Text style={{ color: textSecondary, marginHorizontal: 4 }}>•</Text>
                                        <Text style={styles.cardPropinaGreen}>
                                            +${item.propina.toLocaleString()}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDark ? '#111827' : '#FFFFFF', paddingTop: insets.top + 10, paddingBottom: 15 }]}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={[styles.headerTitle, { color: textPrimary }]}>Ventas</Text>
                        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>Historial de transacciones</Text>
                    </View>

                    <View style={styles.headerActions}>

                        <Pressable onPress={() => router.push('/cajero/nueva-venta')} style={styles.plusBtn}>
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                            <Text style={styles.plusBtnText}>Nuevo</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : (
                <FlatList
                    data={ventas}
                    renderItem={renderVentaCard}
                    keyExtractor={item => item.id_venta.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
                    ListHeaderComponent={null}
                    ListEmptyComponent={
                        <View style={[styles.emptyCard, { borderColor }]}>
                            <Ionicons name="receipt-outline" size={64} color={textSecondary} />
                            <Text style={[styles.emptyText, { color: textPrimary }]}>No hay ventas registradas</Text>
                            <Text style={[styles.emptySub, { color: textSecondary }]}>Las ventas aparecerán conforme se procesen los pagos.</Text>
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
                        {loadingDetail ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color="#8B5CF6" />
                                <Text style={{ color: textSecondary, marginTop: 10 }}>Cargando detalles...</Text>
                            </View>
                        ) : selectedVenta && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Venta</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedVenta.codigo}</Text>
                                    </View>
                                    <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color={textSecondary} />
                                    </Pressable>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                    {/* Top Info Grid */}
                                    <View style={styles.detailsGrid}>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA DE VENTA</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>
                                                {new Date(selectedVenta.fecha_crea).toLocaleDateString('es-CL')}
                                            </Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>
                                                {selectedVenta.cliente_nombre || 'Sin cliente registrado'}
                                            </Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>MÉTODO DE PAGO</Text>
                                            <View style={[styles.methodBadgeDetail, { backgroundColor: isDark ? '#37415120' : '#F3F4F6' }]}>
                                                <Text style={[styles.methodTextDetail, { color: textPrimary }]}>
                                                    {selectedVenta.metodo_pago.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>GARZÓN</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>
                                                {selectedVenta.garzon_nombre || 'sebastian flores'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Hostess Section */}
                                    <View style={styles.hostessSection}>
                                        <Text style={[styles.sectionTitle, { color: textSecondary }]}>ANFITRIONA(S) ASIGNADA(S)</Text>
                                        <View style={styles.hostessBadges}>
                                            {selectedVenta.usuarios && selectedVenta.usuarios.length > 0 ? (
                                                selectedVenta.usuarios.map((u: any, idx: number) => (
                                                    <View key={idx} style={[styles.hostessBadgeDetail, { backgroundColor: '#8B5CF615' }]}>
                                                        <Text style={styles.hostessTextDetail}>{u.nick || 'User'}</Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <View style={[styles.hostessBadgeDetail, { backgroundColor: '#37415120' }]}>
                                                    <Text style={[styles.hostessTextDetail, { color: textSecondary }]}>Venta directa en barra</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Product Table */}
                                    <View style={[styles.tableContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor }]}>
                                        <View style={[styles.tableHeaderRow, { borderBottomColor: borderColor }]}>
                                            <Text style={[styles.tableHead, { flex: 2, color: textSecondary }]}>Producto</Text>
                                            <Text style={[styles.tableHead, { flex: 1, color: textSecondary, textAlign: 'center' }]}>Cant.</Text>
                                            <Text style={[styles.tableHead, { flex: 1.2, color: textSecondary, textAlign: 'right' }]}>Precio</Text>
                                            <Text style={[styles.tableHead, { flex: 1.2, color: textSecondary, textAlign: 'right' }]}>Sub Total</Text>
                                        </View>

                                        {selectedVenta.detalles && selectedVenta.detalles.map((det: any, idx: number) => (
                                            <View key={idx} style={[styles.tableRow, { borderBottomColor: idx === selectedVenta.detalles.length - 1 ? 'transparent' : borderColor }]}>
                                                <Text style={[styles.productName, { flex: 2, color: textPrimary }]}>{det.producto_nombre}</Text>
                                                <Text style={[styles.productQty, { flex: 1, color: textPrimary, textAlign: 'center' }]}>{det.cantidad}</Text>
                                                <Text style={[styles.productPrice, { flex: 1.2, color: textPrimary, textAlign: 'right' }]}>${det.precio.toLocaleString()}</Text>
                                                <Text style={[styles.productSubtotal, { flex: 1.2, color: textPrimary, textAlign: 'right' }]}>${det.sub_total.toLocaleString()}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Summary Totals */}
                                    <View style={styles.summarySection}>
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text>
                                            <Text style={[styles.summaryVal, { color: textPrimary }]}>${(selectedVenta.total - (selectedVenta.propina || 0)).toLocaleString()}</Text>
                                        </View>
                                        {selectedVenta.propina > 0 && (
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Propina</Text>
                                                <Text style={[styles.summaryVal, { color: '#10B981' }]}>${selectedVenta.propina.toLocaleString()}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}>
                                            <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL</Text>
                                            <Text style={styles.totalValFinal}>${selectedVenta.total.toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </ScrollView>

                                <Pressable
                                    style={[styles.modalCloseBtn, { backgroundColor: '#8B5CF6' }]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Action Sheet Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={actionSheetVisible}
                onRequestClose={() => setActionSheetVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setActionSheetVisible(false)}
                >
                    <View style={[styles.actionSheet, { backgroundColor: cardBg }]}>
                        <View style={styles.actionSheetHeader}>
                            <View style={styles.actionSheetHandle} />
                            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Opciones de Venta</Text>
                            <Text style={[styles.actionSheetSub, { color: textSecondary }]}>Código: {activeVenta?.codigo}</Text>
                        </View>

                        <Pressable
                            style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                            onPress={() => handleVerDetalles(activeVenta?.id_venta)}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#8B5CF615' }]}>
                                <Ionicons name="eye-outline" size={22} color="#8B5CF6" />
                            </View>
                            <Text style={[styles.actionText, { color: textPrimary }]}>Ver Detalles / Recibo</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                            onPress={handleAnularVenta}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#EF444415' }]}>
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </View>
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Solicitar Anulación</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionCancelBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                            onPress={() => setActionSheetVisible(false)}
                        >
                            <Text style={[styles.actionCancelText, { color: textPrimary }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Custom Toast Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={toast.visible}
                onRequestClose={() => setToast(prev => ({ ...prev, visible: false }))}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={[styles.toastCard, { backgroundColor: cardBg, borderColor }]}>
                        <View style={[styles.toastIconBox, { backgroundColor: toast.type === 'success' ? '#10B98120' : '#EF444420' }]}>
                            <Ionicons
                                name={toast.type === 'success' ? 'checkmark-circle-outline' : 'warning-outline'}
                                size={48}
                                color={toast.type === 'success' ? '#10B981' : '#EF4444'}
                            />
                        </View>
                        <Text style={[styles.toastTitle, { color: textPrimary }]}>{toast.title}</Text>
                        <Text style={[styles.toastMessage, { color: textSecondary }]}>{toast.message}</Text>
                        <Pressable
                            style={[styles.toastBtn, { backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444' }]}
                            onPress={() => setToast(prev => ({ ...prev, visible: false }))}
                        >
                            <Text style={styles.toastBtnText}>Entendido</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
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
        marginBottom: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    plusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        gap: 4
    },
    plusBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    headerSubtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, paddingBottom: 100 },

    // Resumen Card
    resumenCard: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 20,
        elevation: 8,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    resumenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resumenLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
    resumenValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 4 },
    resumenIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    resumenFooter: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    resumenStat: { flex: 1, alignItems: 'center' },
    resumenStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    resumenStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    resumenDivider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.1)' },

    // Card Improved
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderLeftWidth: 6, // Status Indicator Bar
        marginBottom: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    cardMainRow: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLeftContent: { flex: 1.2 },
    cardTopActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardCode: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    statusBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    statusTextSmall: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

    cardDetailsList: { gap: 6 },
    detailItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowIcon: { width: 16, textAlign: 'center' },
    detailValue: { fontSize: 14, fontWeight: '600' },

    hostessPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 1 },
    hostessText: { fontSize: 13, fontWeight: '800' },

    cardRightContent: { flex: 0.8, alignItems: 'flex-end', justifyContent: 'space-between', borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.03)', paddingLeft: 12 },
    methodBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.8 },
    methodText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    cardTotalBig: { fontSize: 22, fontWeight: '900' },
    subInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    cardSubCount: { fontSize: 12, fontWeight: '600' },
    cardPropinaGreen: { fontSize: 12, fontWeight: '800', color: '#10B981' },
    moreOptionsBtn: { padding: 4, marginTop: 4 },

    // Empty State
    emptyCard: { borderRadius: 32, padding: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 40, borderStyle: 'dashed' },
    emptyText: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 4 },
    emptySub: { fontSize: 14, fontWeight: '500', textAlign: 'center', opacity: 0.7 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderWidth: 1, borderBottomWidth: 0, height: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitleText: { fontSize: 24, fontWeight: '900' },
    modalSubText: { fontSize: 14, fontWeight: '600' },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },

    // Modal Reference Layout
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24, paddingVertical: 10 },
    gridItem: { width: '47%', marginBottom: 12 },
    gridLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
    gridValue: { fontSize: 15, fontWeight: '700' },
    methodBadgeDetail: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    methodTextDetail: { fontSize: 13, fontWeight: '800' },

    hostessSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
    hostessBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hostessBadgeDetail: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    hostessTextDetail: { fontSize: 13, fontWeight: '800', color: '#8B5CF6' },

    tableContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
    tableHeaderRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
    tableHead: { fontSize: 12, fontWeight: '800' },
    tableRow: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, alignItems: 'center' },
    productName: { fontSize: 14, fontWeight: '800' },
    productQty: { fontSize: 14, fontWeight: '600' },
    productPrice: { fontSize: 14, fontWeight: '600' },
    productSubtotal: { fontSize: 14, fontWeight: '900' },

    summarySection: { padding: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel: { fontSize: 14, fontWeight: '700' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabelFinal: { fontSize: 18, fontWeight: '900' },
    totalValFinal: { fontSize: 24, fontWeight: '900', color: '#8B5CF6' },

    modalCloseBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
    modalCloseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

    // Toast
    toastCard: { width: '90%', padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    toastIconBox: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    toastTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    toastMessage: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 24, opacity: 0.8 },
    toastBtn: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    toastBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    // Action Sheet
    actionSheet: { width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    actionSheetHeader: { alignItems: 'center', marginBottom: 20 },
    actionSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)', marginBottom: 15 },
    actionSheetTitle: { fontSize: 20, fontWeight: '900' },
    actionSheetSub: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    actionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, gap: 16 },
    actionItemPressed: { backgroundColor: 'rgba(0,0,0,0.03)' },
    actionIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    actionText: { fontSize: 16, fontWeight: '700' },
    actionCancelBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    actionCancelText: { fontSize: 16, fontWeight: '800' },
});
