import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import EventSource from 'react-native-sse';
import { MotiView } from 'moti';
import {
    ActivityIndicator,
    DeviceEventEmitter,
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
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { API_URL, apiClient } from '../../../api/client';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useAuthStore } from '../../../store/authStore';
import { PremiumAlert } from '../../../components/PremiumAlert';

export default function SolicitudesScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const numColumns = isTablet ? 2 : 1;
    const { openId, type: queryType } = useLocalSearchParams();
    const [processedOpenId, setProcessedOpenId] = useState<string | null>(null);

    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState(true); // Default a true hasta verificar
    const dataRef = useRef<string>('');

    // Modal state for Checkout
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<any>(null);
    const [pedidoDetails, setPedidoDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('');
    const [agregarPropina, setAgregarPropina] = useState(false);
    const [selectedMinutesPedido, setSelectedMinutesPedido] = useState<number>(0);
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    const bg = isDark ? '#0F0D2E' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB';

    // Alert state
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
    }>({ visible: false, title: '', message: '', type: 'info' });

    // Modal para detalle de servicio
    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);

    // Toast
    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000
        });
    };

    const fetchSolicitudes = useCallback(async (isManual = false) => {
        try {
            const [resSolicitudes, resOrders, resStats] = await Promise.all([
                apiClient('/solicitudes-servicios?estado=pendiente').catch(() => ({ success: false, data: [] })),
                apiClient('/orders').catch(() => ({ success: false, data: [] })),
                apiClient('/caja/stats').catch(() => null)
            ]);

            const newData = { solicitudes: resSolicitudes.data, orders: resOrders.data, stats: resStats };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

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

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching solicitudes:', error);
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Effect to handle navigation params (auto-open modal)
    useEffect(() => {
        if (openId && queryType && solicitudes.length > 0 && openId !== processedOpenId) {
            const id = Number(openId);
            const found = solicitudes.find(s => 
                (queryType === 'new_order' && s.tipoItem === 'pedido' && s.id_pedido === id) ||
                (queryType === 'new_service_request' && s.tipoItem === 'solicitud' && s.id_solicitud === id)
            );
            
            if (found) {
                setProcessedOpenId(openId as string);
                if (queryType === 'new_order') {
                    handleAprobar(id, 'pedido', found);
                } else {
                    setSelectedService(found);
                    setServiceModalVisible(true);
                }
            }
        }
    }, [openId, queryType, solicitudes, processedOpenId]);

    useEffect(() => {
        fetchSolicitudes();
    }, [fetchSolicitudes]);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('refresh_requests', () => {
            fetchSolicitudes();
        });
        return () => subscription.remove();
    }, [fetchSolicitudes]);

    // Real-time updates via SSE
    useEffect(() => {
        const user = useAuthStore.getState().user;
        if (!user?.id) return;

        const sseUrl = `${API_URL}/notifications/sse`;
        let es: EventSource | null = null;

        try {
            es = new EventSource(sseUrl);

            es.addEventListener('message', (event: any) => {
                if (!event.data) return;
                try {
                    const payload = JSON.parse(event.data);
                    if (['new_order', 'order_deleted', 'new_service_request', 'service_request_deleted'].includes(payload.type)) {
                        console.log(`[Solicitudes] Event ${payload.type} received, refreshing`);
                        fetchSolicitudes();
                        
                        // Auto-open modal if it's a new order or request
                        if (payload.type === 'new_order' || payload.type === 'new_service_request') {
                            const id = payload.data.id || payload.data.id_solicitud;
                            if (id) {
                                // We delay it a bit to let fetchSolicitudes update the state
                                setTimeout(() => {
                                    setProcessedOpenId(null); // Reset to ensure the other effect catches it
                                    router.setParams({ openId: String(id), type: payload.type });
                                }, 500);
                            }
                        }
                    }
                } catch (err) {
                    console.error('[Solicitudes] SSE parse error:', err);
                }
            });
        } catch (err) {
            console.warn('[Solicitudes] SSE init error:', err);
        }

        return () => {
            if (es) es.close();
        };
    }, [fetchSolicitudes]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSolicitudes(true);
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
            setSelectedMinutesPedido(30);

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

        setAlertConfig({
            visible: true,
            title: 'Aprobar',
            message: `¿Deseas aprobar y procesar esta solicitud de ${tipo === 'solicitud' ? 'servicio' : 'pedido'}?`,
            type: 'success',
            onConfirm: async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
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
                        DeviceEventEmitter.emit('refresh_requests');
                        fetchSolicitudes();
                        setTimeout(() => router.replace('/cajero' as any), 500);
                    } else {
                        showToast('Error', res.message || 'No se pudo aprobar.', 'error');
                    }
                } catch (err: any) {
                    showToast('Error', err.message || 'Error del servidor', 'error');
                }
            }
        });
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

            const roomId = pedidoDetails.find(d => d.room_id)?.room_id || null;

            const ventaData: any = {
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
                usuarios: usuariosIds,
                tiempo: selectedMinutesPedido,
                habitacion_id: roomId
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
                DeviceEventEmitter.emit('refresh_requests');
                fetchSolicitudes();
                setTimeout(() => router.replace('/cajero' as any), 500);
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

        setAlertConfig({
            visible: true,
            title: 'Rechazar',
            message: `¿Seguro que deseas rechazar este ${tipo === 'solicitud' ? 'servicio' : 'pedido'}?`,
            type: 'danger',
            onConfirm: async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
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
                        showToast('Éxito', 'Solicitud rechazada/eliminada.', 'success');
                        DeviceEventEmitter.emit('refresh_requests');
                        fetchSolicitudes();
                        setTimeout(() => router.replace('/cajero' as any), 500);
                    } else {
                        showToast('Error', res.message || 'No se pudo rechazar.', 'error');
                    }
                } catch (err: any) {
                    showToast('Error', err.message || 'Error del servidor', 'error');
                }
            }
        });
    };

    const renderItem = ({ item }: { item: any }) => {
        const isSolicitud = item.tipoItem === 'solicitud';
        const iconName = isSolicitud ? 'receipt' : 'beer';
        const color = isSolicitud ? accentColor : '#F59E0B';
        const bedText = isSolicitud ? `Hab: ${item.habitacion_nombre || 'N/A'}` : `Mesa/Sala`;
        const personText = isSolicitud ? `Gz: ${item.solicitado_por_nombre || 'Desconocido'}` : `Gz: ${item.garzon || 'Desconocido'}`;
        const timeDate = new Date(isSolicitud ? item.fecha_solicitud : item.fecha_crea);
        const timeText = timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const minutesElapsed = Math.floor((new Date().getTime() - timeDate.getTime()) / 60000);
        const isUrgent = minutesElapsed >= 5;
        const itemId = isSolicitud ? item.id_solicitud : item.id_pedido;

        const handleCardPress = () => {
            if (isSolicitud) {
                setSelectedService(item);
                setServiceModalVisible(true);
            } else {
                handleAprobar(itemId, 'pedido', item);
            }
        };

        return (
            <Pressable
                style={[
                    styles.card, 
                    { backgroundColor: cardBg, borderColor },
                    isUrgent && { borderColor: '#EF4444', borderWidth: 2, shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }
                ]}
                onPress={handleCardPress}
            >
                {isUrgent && (
                    <MotiView
                        from={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                        style={styles.urgentBadge}
                    >
                        <Text style={styles.urgentBadgeText}>ATENCIÓN CRÍTICA</Text>
                    </MotiView>
                )}
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
                        <Ionicons name="time" size={16} color={isUrgent ? '#EF4444' : textSecondary} />
                        <Text style={[styles.infoText, { color: isUrgent ? '#EF4444' : textSecondary, fontWeight: isUrgent ? '800' : '400' }]}>
                            {timeText} ({minutesElapsed} min)
                        </Text>
                    </View>
                </View>

                <View style={[styles.cardFooter, !cajaAbierta && { opacity: 0.5 }]}>
                    <Pressable
                        style={[styles.btnAction, { backgroundColor: '#EF444420' }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRechazar(itemId, item.tipoItem);
                        }}
                        disabled={!cajaAbierta}
                    >
                        <Text style={[styles.btnActionText, { color: '#EF4444' }]}>Rechazar</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.btnAction, { backgroundColor: '#10B981', flex: 1.5 }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleAprobar(itemId, item.tipoItem, item);
                        }}
                        disabled={!cajaAbierta}
                    >
                        <Text style={[styles.btnActionText, { color: '#FFFFFF' }]}>Aprobar</Text>
                    </Pressable>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header premium con gradiente */}
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
                        style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color={isDark ? "#FFFFFF" : "#111827"} />
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={[styles.headerTitle, { color: isDark ? "#111827" : "#FFFFFF" }, isTablet && { fontSize: 28 }]}>
                            Solicitudes
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? "#6B7280" : "rgba(255,255,255,0.8)" }, isTablet && { fontSize: 17 }]}>
                            {!cajaAbierta ? 'Caja cerrada' : 'Pendientes de aprobación'}
                        </Text>
                    </View>
                </View>
                
                {solicitudes.length > 0 && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={styles.urgencyBar}
                    >
                        <Ionicons name="warning" size={20} color="#FFFFFF" />
                        <Text style={styles.urgencyBarText}>
                            ATENCIÓN: {solicitudes.length} SOLICITUDES PENDIENTES
                        </Text>
                    </MotiView>
                )}
            </LinearGradient>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <FlatList
                    data={solicitudes}
                    keyExtractor={item => item.id_unificado}
                    renderItem={renderItem}
                    numColumns={numColumns}
                    columnWrapperStyle={isTablet ? { gap: 16, marginHorizontal: 16 } : undefined}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
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
                                <ActivityIndicator size="large" color={accentColor} />
                                <Text style={{ color: textSecondary, marginTop: 10 }}>Cargando pedido...</Text>
                            </View>
                        ) : selectedPedido && (
                            <>
                                <View style={styles.modalHeaderRow}>
                                    <View style={[styles.iconBox, { backgroundColor: `${accentColor}15` }]}>
                                        <Ionicons name="card-outline" size={24} color={accentColor} />
                                    </View>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Procesar Pago</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Pedido: {selectedPedido.codigo}</Text>
                                    </View>
                                </View>

                                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                                    <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                                        <View style={styles.infoRow}>
                                            <Ionicons name="person-outline" size={18} color={accentColor} />
                                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>
                                                Cliente: <Text style={{ fontWeight: '700' }}>{selectedPedido.cliente || 'Sin cliente registrado'}</Text>
                                            </Text>
                                        </View>
                                        <View style={[styles.infoRow, { marginTop: 6 }]}>
                                            <Ionicons name="restaurant-outline" size={18} color={accentColor} />
                                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>
                                                Garzón: <Text style={{ fontWeight: '700' }}>{selectedPedido.garzon || 'N/A'}</Text>
                                            </Text>
                                        </View>
                                        <View style={[styles.infoRow, { marginTop: 6 }]}>
                                            <Ionicons name="calendar-outline" size={18} color={accentColor} />
                                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>
                                                Fecha/Hora: <Text style={{ fontWeight: '700' }}>
                                                    {new Date(selectedPedido.fecha_crea).toLocaleDateString()} {new Date(selectedPedido.fecha_crea).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </Text>
                                        </View>

                                        {/* NUEVO: Anfitrionas y Habitación del pedido */}
                                        {Array.isArray(pedidoDetails[0]?.anfitrionas_con_ids) && pedidoDetails[0]?.anfitrionas_con_ids.length > 0 && (
                                            <View style={[styles.infoRow, { marginTop: 6 }]}>
                                                <Ionicons name="people-outline" size={18} color={accentColor} />
                                                <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>
                                                    Anfitrionas: <Text style={{ fontWeight: '700' }}>
                                                        {pedidoDetails[0].anfitrionas_con_ids.map((a: any) => a.nick || a.nombre).join(', ')}
                                                    </Text>
                                                </Text>
                                            </View>
                                        )}
                                        {pedidoDetails.find(d => d.room_name) && (
                                            <View style={[styles.infoRow, { marginTop: 6 }]}>
                                                <Ionicons name="bed-outline" size={18} color={accentColor} />
                                                <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>
                                                    Habitación: <Text style={{ fontWeight: '700' }}>{pedidoDetails.find(d => d.room_name).room_name}</Text>
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={[styles.divider, { backgroundColor: borderColor, marginVertical: 15, opacity: 0.1 }]} />

                                    {/* Selector de Tiempo si hay habitación */}
                                    {pedidoDetails.some(d => d.room_id) && (
                                        <View style={{ paddingHorizontal: 16, marginBottom: 15 }}>
                                            <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 10 }]}>Tiempo de Temporizador</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                                {Array.from({ length: 12 }, (_, i) => (i + 1) * 5).map(mins => (
                                                    <Pressable
                                                        key={mins}
                                                        style={[
                                                            styles.payMethodBtn,
                                                            { 
                                                                flex: 0,
                                                                minWidth: 70,
                                                                borderColor: selectedMinutesPedido === mins ? '#10B981' : borderColor,
                                                                backgroundColor: selectedMinutesPedido === mins ? '#10B98115' : 'transparent'
                                                            }
                                                        ]}
                                                        onPress={() => setSelectedMinutesPedido(mins)}
                                                    >
                                                        <Text style={[styles.payMethodLabel, { color: selectedMinutesPedido === mins ? '#10B981' : textSecondary }]}>{mins}m</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {/* Lista de productos con UI de "Ticket / Recibo" */}
                                    <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor }]}>
                                        <View style={styles.optionsTitleContainer}>
                                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Resumen del Pedido</Text>
                                        </View>
                                        <View style={{ marginBottom: 4 }}>
                                            {pedidoDetails.map((item, idx) => (
                                                <View key={idx} style={[styles.productDetailRow, idx !== pedidoDetails.length - 1 && { borderBottomWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <View style={[styles.productQuantityBox, { backgroundColor: `${accentColor}15` }]}>
                                                        <Text style={[styles.productQuantity, { color: accentColor }]}>{item.cantidad}x</Text>
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
                                        <View style={[styles.checkbox, { borderColor: agregarPropina ? '#E11D48' : textSecondary, backgroundColor: agregarPropina ? '#E11D48' : 'transparent' }]}>
                                            {agregarPropina && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.tipText, { color: textPrimary }]}>Agregar 10% de Propina</Text>
                                            <Text style={[styles.tipSubText, { color: textSecondary }]}>+${(selectedPedido.total * 0.10).toLocaleString()}</Text>
                                        </View>
                                    </Pressable>

                                    <View style={[styles.totalsBox, { backgroundColor: '#E11D4810' }]}>
                                        <View style={styles.totalRow}>
                                            <Text style={[styles.totalLabel, { color: textSecondary }]}>Subtotal</Text>
                                            <Text style={[styles.totalValue, { color: textPrimary }]}>${(selectedPedido.total).toLocaleString()}</Text>
                                        </View>
                                        {agregarPropina && (
                                            <View style={[styles.totalRow, { marginTop: 4 }]}>
                                                <Text style={[styles.totalLabel, { color: textSecondary }]}>Propina (10%)</Text>
                                                <Text style={[styles.totalValue, { color: '#E11D48' }]}>+${(selectedPedido.total * 0.10).toLocaleString()}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.totalRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(139, 92, 246, 0.2)', paddingTop: 12 }]}>
                                            <Text style={[styles.finalLabel, { color: textPrimary }]}>Monto Final</Text>
                                            <Text style={[styles.finalValue, { color: '#E11D48' }]}>${(selectedPedido.total + (agregarPropina ? selectedPedido.total * 0.10 : 0)).toLocaleString()}</Text>
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
                                        style={[styles.modalBtnAction, { backgroundColor: '#E11D48', opacity: !metodoPago || submittingCheckout ? 0.6 : 1 }]}
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

            <Modal
                animationType="fade"
                transparent={true}
                visible={serviceModalVisible}
                onRequestClose={() => setServiceModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.checkoutModal, { backgroundColor: cardBg, borderColor }]}>
                        {selectedService && (
                            <>
                                <View style={styles.modalHeaderRow}>
                                    <View style={[styles.iconBox, { backgroundColor: '#E11D4820' }]}>
                                        <Ionicons name="receipt-outline" size={24} color="#E11D48" />
                                    </View>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Servicio</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedService.codigo || '#' + selectedService.id_solicitud}</Text>
                                    </View>
                                </View>

                                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                                    <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor }]}>
                                        <View style={styles.productDetailRow}>
                                            <View style={styles.productInfoCol}>
                                                <Text style={[styles.productName, { color: textPrimary }]}>Precio Servicio</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: textPrimary }]}>${(selectedService.precio_servicio || 0).toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.productDetailRow}>
                                            <View style={styles.productInfoCol}>
                                                <Text style={[styles.productName, { color: textPrimary }]}>Precio Habitación</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: textPrimary }]}>${(selectedService.precio_habitacion || 0).toLocaleString()}</Text>
                                        </View>
                                        <View style={[styles.productDetailRow, { borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginTop: 8 }]}>
                                            <View style={styles.productInfoCol}>
                                                <Text style={[styles.productName, { color: textPrimary, fontWeight: '800' }]}>TOTAL</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: '#E11D48', fontSize: 18 }]}>${(selectedService.total || 0).toLocaleString()}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.optionsTitleContainer}>
                                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Información</Text>
                                    </View>

                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="bed-outline" size={20} color="#E11D48" />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>Habitación: {selectedService.habitacion_nombre}</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="person-outline" size={20} color="#E11D48" />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>Solicitado por: {selectedService.solicitado_por_nombre}</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="people-outline" size={20} color="#E11D48" />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>Anfitrionas: {selectedService.anfitrionas_ids?.length || 0}</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="time-outline" size={20} color="#E11D48" />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>Tiempo: {selectedService.tiempo} min</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="card-outline" size={20} color="#E11D48" />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8 }]}>Método Pago: {selectedService.metodo_pago.toUpperCase()}</Text>
                                    </View>
                                </ScrollView>

                                <View style={styles.modalActionsRow}>
                                    <Pressable
                                        style={[styles.modalBtnAction, { backgroundColor: 'transparent', borderWidth: 1, borderColor }]}
                                        onPress={() => setServiceModalVisible(false)}
                                    >
                                        <Text style={[styles.modalBtnActionText, { color: textSecondary }]}>Cerrar</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.modalBtnAction, { backgroundColor: '#10B981' }]}
                                        onPress={() => {
                                            setServiceModalVisible(false);
                                            handleAprobar(selectedService.id_solicitud, 'solicitud');
                                        }}
                                    >
                                        <Text style={[styles.modalBtnActionText, { color: '#FFFFFF' }]}>Aprobar Ahora</Text>
                                    </Pressable>
                                </View>
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
                showCancel
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(155,155,155,0.1)',
    },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    headerSubtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, paddingBottom: 100 },
    card: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
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
    urgentBadge: {
        position: 'absolute',
        top: -12,
        right: 16,
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#EF4444',
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    urgentBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    urgencyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 15,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    urgencyBarText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    modalTitleText: { fontSize: 22, fontWeight: '800' },
    modalSubText: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    optionsTitleContainer: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    receiptContainer: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
    productDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    productQuantityBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
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
    divider: { height: 1, width: '100%' },
});
