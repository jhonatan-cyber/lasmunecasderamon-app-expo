import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
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

export default function SolicitudesScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState(true); // Default a true hasta verificar

    // Modal state for Checkout
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<any>(null);
    const [pedidoDetails, setPedidoDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('');
    const [agregarPropina, setAgregarPropina] = useState(false);
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    // Toast modal state
    const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' }>({ visible: false, title: '', message: '', type: 'success' });

    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        setToast({ visible: true, title, message, type });
    };

    const fetchSolicitudes = useCallback(async () => {
        try {
            const [resSolicitudes, resOrders, resStats] = await Promise.all([
                apiClient('/solicitudes-servicios?estado=pendiente').catch(() => ({ success: false, data: [] })),
                apiClient('/orders').catch(() => ({ success: false, data: [] })),
                apiClient('/caja/stats').catch(() => null)
            ]);

            if (resStats && typeof resStats.cajas_abiertas !== 'undefined') {
                setCajaAbierta(resStats.cajas_abiertas > 0);
            }

            let combined: any[] = [];

            if (resSolicitudes.success) {
                const arr = (resSolicitudes.data || []).map((s: any) => ({
                    ...s,
                    tipoItem: 'solicitud',
                    id_unificado: `solicitud_${s.id_solicitud}`,
                    fecha_orden: new Date(s.fecha_solicitud).getTime()
                }));
                combined = [...combined, ...arr];
            }

            if (resOrders.success) {
                const arr = (resOrders.data || []).map((o: any) => ({
                    ...o,
                    tipoItem: 'pedido',
                    id_unificado: `pedido_${o.id_pedido}`,
                    fecha_orden: new Date(o.fecha_crea).getTime()
                }));
                combined = [...combined, ...arr];
            }

            combined.sort((a, b) => b.fecha_orden - a.fecha_orden);
            setSolicitudes(combined);
        } catch (error) {
            console.error('Error fetching solicitudes:', error);
            showToast('Error', 'No se pudieron cargar las solicitudes.', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSolicitudes();
    }, [fetchSolicitudes]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSolicitudes();
    };

    const handleAprobar = async (id: number, tipo: string, itemInfo?: any) => {
        if (!cajaAbierta) {
            showToast('Caja Cerrada', 'No puedes aprobar servicios ni pedidos porque no hay una caja abierta.', 'error');
            return;
        }

        if (tipo === 'pedido' && itemInfo) {
            // Logica especial para checkout de pedidos (Tragos/Botellas)
            setSelectedPedido(itemInfo);
            setMetodoPago('');
            setAgregarPropina(false);
            setCheckoutModalVisible(true);
            setLoadingDetails(true);

            try {
                const res = await apiClient(`/orders/detail?id=${id}`);
                if (res.success) {
                    setPedidoDetails(res.data);

                    // Si ya venia con propina pre-seleccionada desde el garzon
                    if (res.data && res.data[0] && res.data[0].propina > 0) {
                        setAgregarPropina(true);
                    }
                } else {
                    showToast('Error', 'No se pudieron cargar los detalles del pedido', 'error');
                    setCheckoutModalVisible(false);
                }
            } catch (err) {
                showToast('Error', 'No se pudieron cargar los detalles del pedido', 'error');
                setCheckoutModalVisible(false);
            } finally {
                setLoadingDetails(false);
            }
            return;
        }

        Alert.alert(
            'Aprobar',
            `¿Deseas aprobar y procesar esta solicitud de servicio?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aprobar',
                    style: 'default',
                    onPress: async () => {
                        try {
                            const endpoint = tipo === 'solicitud'
                                ? `/solicitudes-servicios/${id}/aprobar`
                                : `/orders/${id}`;

                            const method = tipo === 'solicitud' ? 'PATCH' : 'PUT';
                            const body = tipo === 'solicitud' ? {} : { estado: 0 };

                            const res = await apiClient(endpoint, {
                                method,
                                body: JSON.stringify(body)
                            });

                            if (res.success) {
                                showToast('Éxito', `${tipo === 'solicitud' ? 'Servicio' : 'Pedido'} procesado correctamente.`, 'success');
                                fetchSolicitudes();
                            } else {
                                showToast('Error', res.message || 'No se pudo aprobar.', 'error');
                            }
                        } catch (err: any) {
                            showToast('Error', err.message || 'Error del servidor', 'error');
                        }
                    }
                }
            ]
        );
    };

    const handleCheckoutSubmit = async () => {
        if (!metodoPago) {
            showToast('Atención', 'Selecciona un método de pago', 'error');
            return;
        }

        if (pedidoDetails.length === 0) {
            showToast('Error', 'Detalles del pedido incompletos', 'error');
            return;
        }

        setSubmittingCheckout(true);

        try {
            const pedido = pedidoDetails[0];
            const sub_total = pedidoDetails.reduce((acc, obj) => acc + ((obj.precio || 0) * (obj.cantidad || 0)), 0);
            const propina = agregarPropina ? sub_total * 0.10 : 0;

            // Construir JSON de anfitrionas que ganan comision si existe en detail[0]
            let usuariosIds: number[] = [];
            const anfs = pedido?.anfitrionas_con_ids || [];
            if (Array.isArray(anfs)) {
                usuariosIds = anfs.map((a: any) => a.usuario_id).filter(id => id && !isNaN(id));
            }

            const ventaData = {
                cliente_id: pedido?.cliente_id || null,
                pedido_id: selectedPedido.id_pedido,
                metodo_pago: metodoPago,
                propina,
                sub_total,
                total: sub_total + propina,
                detalles: pedidoDetails.map(item => ({
                    producto_id: item.id_producto || item.producto_id,
                    precio: item.precio || 0,
                    cantidad: item.cantidad || 0,
                    comision: item.comision || 0,
                    sub_total: (item.precio || 0) * (item.cantidad || 0),
                    hostess_id: item.hostess_id || null
                })),
                usuarios: usuariosIds
            };

            const ventaRes = await apiClient('/sales', {
                method: 'POST',
                body: JSON.stringify(ventaData)
            });

            if (!ventaRes.success) {
                showToast('Error', ventaRes.message || 'Error registrando la venta', 'error');
                setSubmittingCheckout(false);
                return;
            }

            const updateRes = await apiClient(`/orders/${selectedPedido.id_pedido}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: 0 })
            });

            if (updateRes.success) {
                showToast('Éxito', 'Pedido pagado correctamente', 'success');
                setCheckoutModalVisible(false);
                fetchSolicitudes();
            } else {
                showToast('Advertencia', 'Venta lista pero falló al cerrar el proceso.', 'error');
            }

        } catch (error: any) {
            showToast('Error', error.message || 'Error de servidor procesando pedido', 'error');
        } finally {
            setSubmittingCheckout(false);
        }
    };

    const handleRechazar = async (id: number, tipo: string) => {
        if (!cajaAbierta) {
            showToast('Caja Cerrada', 'No puedes rechazar servicios ni pedidos porque no hay una caja abierta.', 'error');
            return;
        }

        Alert.alert(
            'Rechazar',
            `¿Seguro que deseas rechazar este ${tipo === 'solicitud' ? 'servicio' : 'pedido'}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Rechazar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const endpoint = tipo === 'solicitud'
                                ? `/solicitudes-servicios/${id}/rechazar`
                                : `/orders/${id}`;

                            const method = tipo === 'solicitud' ? 'PATCH' : 'PUT';
                            const body = tipo === 'solicitud'
                                ? { motivo_rechazo: 'Rechazado desde caja' }
                                : { estado: 2 };

                            const res = await apiClient(endpoint, {
                                method,
                                body: JSON.stringify(body)
                            });

                            if (res.success) {
                                showToast('Rechazado', `${tipo === 'solicitud' ? 'Servicio' : 'Pedido'} ha sido rechazado.`, 'success')
                                fetchSolicitudes();
                            } else {
                                showToast('Error', res.message || 'No se pudo rechazar.', 'error');
                            }
                        } catch (err: any) {
                            showToast('Error', err.message || 'Error del servidor', 'error');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const isSolicitud = item.tipoItem === 'solicitud';
        const iconName = isSolicitud ? 'receipt' : 'beer';
        const color = isSolicitud ? '#8B5CF6' : '#F59E0B';
        const bedText = isSolicitud ? `Hab: ${item.habitacion_nombre || 'N/A'}` : `Mesa/Sala`;
        const personText = isSolicitud ? `Gz: ${item.solicitado_por_nombre || 'Desconocido'}` : `Gz: ${item.garzon || 'Desconocido'}`;
        const timeText = new Date(isSolicitud ? item.fecha_solicitud : item.fecha_crea).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const itemId = isSolicitud ? item.id_solicitud : item.id_pedido;

        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.badgeContainer}>
                        <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                            <Ionicons name={iconName} size={16} color={color} />
                        </View>
                        <Text style={[styles.codigo, { color: textPrimary }]}>{item.codigo}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
                            <Text style={[styles.typeText, { color }]}>{isSolicitud ? 'Servicio' : 'Trago'}</Text>
                        </View>
                    </View>
                    <Text style={styles.precio}>${(item.total || 0).toLocaleString()}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="bed" size={16} color={textSecondary} />
                        <Text style={[styles.infoText, { color: textSecondary }]}>{bedText}</Text>
                    </View>
                    <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Ionicons name="person" size={16} color={textSecondary} />
                        <Text style={[styles.infoText, { color: textSecondary }]}>{personText}</Text>
                    </View>
                    <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Ionicons name="time" size={16} color={textSecondary} />
                        <Text style={[styles.infoText, { color: textSecondary }]}>{timeText}</Text>
                    </View>
                </View>

                <View style={[styles.cardFooter, !cajaAbierta && { opacity: 0.5 }]}>
                    <Pressable
                        style={[styles.btnAction, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleRechazar(itemId, item.tipoItem)}
                        disabled={!cajaAbierta}
                    >
                        <Text style={[styles.btnActionText, { color: '#EF4444' }]}>Rechazar</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.btnAction, { backgroundColor: '#10B981', flex: 1.5 }]}
                        onPress={() => handleAprobar(itemId, item.tipoItem, item)}
                        disabled={!cajaAbierta}
                    >
                        <Text style={[styles.btnActionText, { color: '#FFFFFF' }]}>Aprobar</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : (
                <FlatList
                    data={solicitudes}
                    keyExtractor={item => item.id_unificado}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
                    ListEmptyComponent={
                        <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
                            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" style={{ marginBottom: 12 }} />
                            <Text style={[styles.emptyText, { color: textPrimary }]}>
                                {!cajaAbierta ? 'Caja Cerrada' : 'Todo al día'}
                            </Text>
                            <Text style={[styles.emptySub, { color: textSecondary }]}>
                                {!cajaAbierta ? 'Abre una caja para procesar' : 'No hay solicitudes pendientes'}
                            </Text>
                        </View>
                    }
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={checkoutModalVisible}
                onRequestClose={() => setCheckoutModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.checkoutModal, { backgroundColor: cardBg, borderColor }]}>
                        {loadingDetails ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color="#8B5CF6" />
                                <Text style={{ color: textSecondary, marginTop: 10 }}>Cargando pedido...</Text>
                            </View>
                        ) : selectedPedido && (
                            <>
                                <View style={styles.modalHeaderRow}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="card-outline" size={24} color="#8B5CF6" />
                                    </View>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Procesar Pago</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Pedido: {selectedPedido.codigo}</Text>
                                    </View>
                                </View>

                                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                                    {/* Lista de productos con UI de "Ticket / Recibo" */}
                                    <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor }]}>
                                        <View style={styles.optionsTitleContainer}>
                                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Resumen del Pedido</Text>
                                        </View>
                                        <View style={{ marginBottom: 4 }}>
                                            {pedidoDetails.map((item, idx) => (
                                                <View key={idx} style={[styles.productDetailRow, idx !== pedidoDetails.length - 1 && { borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <View style={styles.productQuantityBox}>
                                                        <Text style={[styles.productQuantity, { color: '#8B5CF6' }]}>{item.cantidad}x</Text>
                                                    </View>
                                                    <View style={styles.productInfoCol}>
                                                        <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={2}>
                                                            {item.producto || 'Producto Desconocido'}
                                                        </Text>
                                                        <Text style={[styles.productPrice, { color: textSecondary }]}>
                                                            ${(item.precio || 0).toLocaleString()} c/u
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.productSubtotal, { color: textPrimary }]}>
                                                        ${((item.precio || 0) * (item.cantidad || 0)).toLocaleString()}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.optionsTitleContainer}>
                                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Método de Pago</Text>
                                    </View>

                                    <View style={styles.paymentMethodsGrid}>
                                        {[
                                            { id: 'efectivo', icon: 'cash-outline', label: 'Efectivo', color: '#10B981' },
                                            { id: 'tarjeta', icon: 'card-outline', label: 'Tarjeta', color: '#3B82F6' },
                                            { id: 'transferencia', icon: 'swap-horizontal-outline', label: 'Transf.', color: '#F59E0B' }
                                        ].map(method => {
                                            const isSelected = metodoPago === method.id;
                                            return (
                                                <Pressable
                                                    key={method.id}
                                                    style={[
                                                        styles.payMethodBtn,
                                                        { borderColor: isSelected ? method.color : borderColor },
                                                        isSelected && { backgroundColor: `${method.color}15` }
                                                    ]}
                                                    onPress={() => setMetodoPago(method.id as any)}
                                                >
                                                    <Ionicons name={method.icon as any} size={24} color={isSelected ? method.color : textSecondary} />
                                                    <Text style={[styles.payMethodLabel, { color: isSelected ? method.color : textSecondary }]}>{method.label}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    <Pressable
                                        style={[styles.tipCheckboxContainer, { borderColor }]}
                                        onPress={() => setAgregarPropina(!agregarPropina)}
                                    >
                                        <View style={[styles.checkbox, { borderColor: agregarPropina ? '#8B5CF6' : textSecondary, backgroundColor: agregarPropina ? '#8B5CF6' : 'transparent' }]}>
                                            {agregarPropina && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.tipText, { color: textPrimary }]}>Agregar 10% de Propina</Text>
                                            <Text style={[styles.tipSubText, { color: textSecondary }]}>+${(selectedPedido.total * 0.10).toLocaleString()}</Text>
                                        </View>
                                    </Pressable>

                                    <View style={[styles.totalsBox, { backgroundColor: '#8B5CF610' }]}>
                                        <View style={styles.totalRow}>
                                            <Text style={[styles.totalLabel, { color: textSecondary }]}>Subtotal</Text>
                                            <Text style={[styles.totalValue, { color: textPrimary }]}>${(selectedPedido.total).toLocaleString()}</Text>
                                        </View>
                                        {agregarPropina && (
                                            <View style={[styles.totalRow, { marginTop: 4 }]}>
                                                <Text style={[styles.totalLabel, { color: textSecondary }]}>Propina (10%)</Text>
                                                <Text style={[styles.totalValue, { color: '#8B5CF6' }]}>+${(selectedPedido.total * 0.10).toLocaleString()}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.totalRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(139, 92, 246, 0.2)', paddingTop: 12 }]}>
                                            <Text style={[styles.finalLabel, { color: textPrimary }]}>Monto Final</Text>
                                            <Text style={[styles.finalValue, { color: '#8B5CF6' }]}>${(selectedPedido.total + (agregarPropina ? selectedPedido.total * 0.10 : 0)).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </ScrollView>

                                <View style={styles.modalActionsRow}>
                                    <Pressable
                                        style={[styles.modalBtnAction, { backgroundColor: 'transparent', borderWidth: 1, borderColor }]}
                                        onPress={() => setCheckoutModalVisible(false)}
                                        disabled={submittingCheckout}
                                    >
                                        <Text style={[styles.modalBtnActionText, { color: textSecondary }]}>Cancelar</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.modalBtnAction, { backgroundColor: '#8B5CF6', opacity: !metodoPago || submittingCheckout ? 0.6 : 1 }]}
                                        onPress={handleCheckoutSubmit}
                                        disabled={!metodoPago || submittingCheckout}
                                    >
                                        {submittingCheckout ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={[styles.modalBtnActionText, { color: '#FFFFFF' }]}>Procesar Pago</Text>
                                        )}
                                    </Pressable>
                                </View>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Custom Premium Toast Modal */}
            <Modal
                transparent={true}
                visible={toast.visible}
                animationType="fade"
                onRequestClose={() => setToast(prev => ({ ...prev, visible: false }))}
            >
                <View style={[styles.toastOverlay, { paddingTop: insets.top + 20 }]}>
                    <View style={[
                        styles.toastContent,
                        {
                            backgroundColor: toast.type === 'success'
                                ? (isDark ? '#064E3B' : '#ECFDF5')
                                : (isDark ? '#7F1D1D' : '#FEF2F2'),
                            borderColor: toast.type === 'success'
                                ? (isDark ? '#059669' : '#10B981')
                                : (isDark ? '#DC2626' : '#EF4444'),
                        }
                    ]}>
                        <View style={[
                            styles.toastIconBox,
                            {
                                backgroundColor: toast.type === 'success'
                                    ? (isDark ? '#059669' : '#10B981')
                                    : (isDark ? '#DC2626' : '#EF4444'),
                            }
                        ]}>
                            <Ionicons
                                name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                                size={24}
                                color="#FFFFFF"
                            />
                        </View>
                        <View style={styles.toastTextContainer}>
                            <Text style={[
                                styles.toastTitle,
                                {
                                    color: toast.type === 'success'
                                        ? (isDark ? '#A7F3D0' : '#065F46')
                                        : (isDark ? '#FECACA' : '#991B1B')
                                }
                            ]}>
                                {toast.title}
                            </Text>
                            <Text style={[
                                styles.toastMessage,
                                {
                                    color: toast.type === 'success'
                                        ? (isDark ? '#D1FAE5' : '#047857')
                                        : (isDark ? '#FEE2E2' : '#B91C1C')
                                }
                            ]}>
                                {toast.message}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setToast(prev => ({ ...prev, visible: false }))}
                            style={styles.toastCloseBtn}
                        >
                            <Ionicons
                                name="close"
                                size={20}
                                color={toast.type === 'success'
                                    ? (isDark ? '#A7F3D0' : '#065F46')
                                    : (isDark ? '#FECACA' : '#991B1B')}
                            />
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
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    headerSubtitle: { fontSize: 14, textAlign: 'center', marginTop: -5 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, paddingBottom: 100 },
    card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center' },
    codigo: { fontSize: 16, fontWeight: '800' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
    typeText: { fontSize: 12, fontWeight: '700' },
    precio: { fontSize: 18, fontWeight: '900', color: '#10B981' },
    cardBody: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, fontWeight: '600' },
    cardFooter: { flexDirection: 'row', gap: 10 },
    btnAction: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    btnActionText: { fontSize: 14, fontWeight: '800' },
    emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 40, borderStyle: 'dashed' },
    emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    emptySub: { fontSize: 14, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    checkoutModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderBottomWidth: 0, minHeight: 400, maxHeight: '90%' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    modalTitleText: { fontSize: 22, fontWeight: '800' },
    modalSubText: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    optionsTitleContainer: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    receiptContainer: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
    productDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    productQuantityBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#8B5CF615', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    productQuantity: { fontSize: 13, fontWeight: '800' },
    productInfoCol: { flex: 1, justifyContent: 'center', paddingRight: 8 },
    productName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    productPrice: { fontSize: 12, fontWeight: '600' },
    productSubtotal: { fontSize: 15, fontWeight: '800' },
    paymentMethodsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    payMethodBtn: { flex: 1, borderWidth: 2, borderRadius: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    payMethodLabel: { fontSize: 13, fontWeight: '700' },
    tipCheckboxContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 16, marginBottom: 20 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    tipText: { fontSize: 16, fontWeight: '700' },
    tipSubText: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    totalsBox: { padding: 16, borderRadius: 16, marginBottom: 24 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 15, fontWeight: '600' },
    totalValue: { fontSize: 16, fontWeight: '800' },
    finalLabel: { fontSize: 18, fontWeight: '800' },
    finalValue: { fontSize: 24, fontWeight: '900' },
    modalActionsRow: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
    modalBtnAction: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    modalBtnActionText: { fontSize: 16, fontWeight: '800' },
    // Toast Styles
    toastOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    toastContent: {
        width: '90%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    toastIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    toastTextContainer: {
        flex: 1,
    },
    toastTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    toastMessage: {
        fontSize: 14,
        fontWeight: '500',
    },
    toastCloseBtn: {
        padding: 4,
        marginLeft: 8,
    },
});
