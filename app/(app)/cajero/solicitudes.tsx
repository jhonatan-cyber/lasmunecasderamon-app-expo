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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { API_URL, apiClient } from '../../../api/client';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useAuthStore } from '../../../store/authStore';
import { PremiumAlert } from '../../../components/PremiumAlert';
import { useTimer } from '../../../context/TimerContext';
import { Skeleton } from '../../../components/ui/Skeleton';

// Helper para parsear fechas del backend de forma segura y evitar conflictos de zona horaria (UTC vs Local)
const parseDateSafe = (dateStr: any) => {
    if (!dateStr) return new Date();
    if (typeof dateStr !== 'string') return new Date(dateStr);
    
    // Si ya viene con zona horaria (Z o offset +/-), el constructor nativo funcionará bien
    if (dateStr.includes('Z') || dateStr.includes('+')) {
        return new Date(dateStr);
    }
    
    // Si no tiene zona horaria, forzamos el parseo como hora LOCAL para evitar desfases (ej. de 4 horas)
    // Usamos el formato YYYY/MM/DD HH:mm:ss que es el más robusto para ser interpretado como local
    try {
        const cleanDate = dateStr.replace('T', ' ').replace(/-/g, '/');
        const date = new Date(cleanDate);
        
        // Si el resultado no es un número válido, intentamos el nativo
        if (isNaN(date.getTime())) return new Date(dateStr);
        return date;
    } catch (e) {
        return new Date(dateStr);
    }
};

const SolicitudesSkeleton = ({ bg, cardBg, borderColor, insets, isTablet, gradientColors }: any) => (
    <View style={{ flex: 1, backgroundColor: bg }}>
        <LinearGradient
            colors={gradientColors as any}
            style={[styles.header, { paddingTop: insets.top + (isTablet ? 20 : 10), height: 160, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={150} height={30} />
                <Skeleton width={44} height={44} borderRadius={22} />
            </View>
            <Skeleton width="60%" height={24} />
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 20 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                        <Skeleton width={120} height={20} />
                        <Skeleton width={80} height={20} borderRadius={10} />
                    </View>
                    <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 15 }} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
                        <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
                    </View>
                </View>
            ))}
        </ScrollView>
    </View>
);

export default function SolicitudesScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const router = useRouter();
    const { serverOffset } = useTimer();
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
    // Tick local para re-render en tiempo real
    const [nowTick, setNowTick] = useState(0);

    // Modal state for Checkout
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<any>(null);
    const [pedidoDetails, setPedidoDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('');
    const [agregarPropina, setAgregarPropina] = useState(false);
    const [selectedMinutesPedido, setSelectedMinutesPedido] = useState<number>(30); // Default to 30 mins
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

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
    const [allHostesses, setAllHostesses] = useState<any[]>([]);

    // Toast
    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000
        });
    };

    const { accentBg, accentBorder } = useAccentColor();

    const fetchSolicitudes = useCallback(async (isManual = false) => {
        try {
            const [resSolicitudes, resOrders, resAnticipos, resStats, resAnfitrionas] = await Promise.all([
                apiClient('/solicitudes-servicios?estado=pendiente').catch(() => ({ success: false, data: [] })),
                apiClient('/orders').catch(() => ({ success: false, data: [] })),
                apiClient('/anticipos').catch(() => ({ success: false, data: [] })),
                apiClient('/caja/stats').catch(() => null),
                apiClient('/users?anfitrionas=1').catch(() => ({ success: false, data: [] }))
            ]);

            if (resAnfitrionas.success) {
                setAllHostesses(resAnfitrionas.data || []);
            }

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
                    fecha_orden: parseDateSafe(s.fecha_solicitud).getTime()
                }));
                combined = [...combined, ...arr];
            }

            if (resOrders.success) {
                const arr = (resOrders.data || []).map((o: any) => ({
                    ...o,
                    tipoItem: 'pedido',
                    id_unificado: `pedido_${o.id_pedido}`,
                    fecha_orden: parseDateSafe(o.fecha_crea).getTime()
                }));
                combined = [...combined, ...arr];
            }

            if (resAnticipos.success) {
                // Solo mostrar anticipos aprobados pero no pagados (estado 1)
                // Opcionalmente mostrar los pendientes (estado 2) para que el cajero sepa que vienen
                const arr = (resAnticipos.data || [])
                    .filter((a: any) => a.estado === 1 || a.estado === 2)
                    .map((a: any) => ({
                        ...a,
                        tipoItem: 'anticipo',
                        id_unificado: `anticipo_${a.id_anticipo}`,
                        fecha_orden: parseDateSafe(a.fecha_crea).getTime()
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

    useEffect(() => {
        if (openId && queryType && solicitudes.length > 0 && openId !== processedOpenId) {
            const id = openId as string;
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
        const id = setInterval(() => setNowTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('refresh_requests', () => {
            fetchSolicitudes();
        });
        return () => subscription.remove();
    }, [fetchSolicitudes]);


    const onRefresh = () => {
        setRefreshing(true);
        fetchSolicitudes(true);
    };

    const handleAprobar = async (id: string, tipo: string, itemInfo?: any) => {
        if (!cajaAbierta) {
            showToast('Caja Cerrada', 'No puedes aprobar servicios ni pedidos porque no hay una caja abierta.', 'error');
            return;
        }

        if (tipo === 'pedido' && itemInfo) {
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

        if (tipo === 'anticipo') {
            setAlertConfig({
                visible: true,
                title: 'Pagar Anticipo',
                message: `¿Confirmas que has entregado el efectivo de $${itemInfo.monto.toLocaleString()} a ${itemInfo.usuario}?`,
                type: 'success',
                onConfirm: async () => {
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                    try {
                        const res = await apiClient(`/anticipos`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                id_anticipo: id,
                                estado: 0 // Pagado
                            })
                        });

                        if (res.success) {
                            showToast('Éxito', `Anticipo de ${itemInfo.usuario} marcado como pagado.`, 'success');
                            DeviceEventEmitter.emit('refresh_requests');
                            fetchSolicitudes();
                        } else {
                            showToast('Error', res.message || 'No se pudo procesar el pago.', 'error');
                        }
                    } catch (err: any) {
                        showToast('Error', err.message || 'Error del servidor', 'error');
                    }
                }
            });
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

            let usuariosIds: string[] = [];
            const anfs = pedido?.anfitrionas_con_ids || [];
            if (Array.isArray(anfs)) {
                usuariosIds = anfs.map((a: any) => a.usuario_id).filter((id: any) => id);
            }

            const roomId = pedidoDetails.find(d => d.room_id)?.room_id || null;

            const ventaData: any = {
                cliente_id: pedido?.cliente_id || null,
                pedido_id: selectedPedido.id_pedido,
                metodo_pago: metodoPago,
                propina,
                sub_total,
                total: sub_total + propina,
                detalles: pedidoDetails.map((item: any) => ({
                    producto_id: item.id_producto || item.producto_id,
                    precio: item.precio || 0,
                    cantidad: item.cantidad || 0,
                    comision: item.comision || 0,
                    sub_total: (item.precio || 0) * (item.cantidad || 0),
                    hostess_id: item.hostess_id || null
                })),
                usuarios: usuariosIds,
                tiempo: roomId ? selectedMinutesPedido : 0,
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

    const handleRechazar = async (id: string, tipo: string) => {
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
        const isAnticipo = item.tipoItem === 'anticipo';
        const iconName = isSolicitud ? 'receipt' : isAnticipo ? 'cash' : 'beer';
        const color = isSolicitud ? accentColor : isAnticipo ? '#10B981' : '#F59E0B';
        const bedText = isSolicitud ? `Hab: ${item.habitacion_nombre || 'N/A'}` : isAnticipo ? 'Anticipo' : `Mesa/Sala`;
        const personText = isSolicitud ? `Gz: ${item.solicitado_por_nombre || 'Desconocido'}` : isAnticipo ? `De: ${item.usuario}` : `Gz: ${item.garzon || 'Desconocido'}`;
        const recordTime = parseDateSafe(isSolicitud ? item.fecha_solicitud : isAnticipo ? item.fecha_crea : item.fecha_crea);
        
        const timeText = new Date(recordTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        
        const nowServerMs = Date.now() + serverOffset;
        const minutesElapsed = Math.floor((nowServerMs - recordTime.getTime()) / 60000);
        
        const isUrgent = minutesElapsed >= 5 && !isAnticipo;
        const itemId = isSolicitud ? item.id_solicitud : isAnticipo ? item.id_anticipo : item.id_pedido;

        const handleCardPress = () => {
            if (isSolicitud) {
                setSelectedService(item);
                setServiceModalVisible(true);
            } else if (isAnticipo) {
                if (item.estado === 1) {
                    handleAprobar(itemId, 'anticipo', item);
                }
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
                            <Text style={[styles.typeText, { color }]}>{isSolicitud ? 'Servicio' : isAnticipo ? 'Anticipo' : 'Trago'}</Text>
                        </View>
                    </View>
                    <Text style={styles.precio}>${Math.floor(item.monto || item.total || 0).toLocaleString('de-DE')}</Text>
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
                    {isAnticipo ? (
                        <>
                            {item.estado === 2 ? (
                                <View style={[styles.btnAction, { backgroundColor: '#3B82F620', flex: 1 }]}>
                                    <Text style={[styles.btnActionText, { color: '#3B82F6' }]}>Esp. Admin</Text>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.btnAction, { backgroundColor: '#10B981', flex: 1 }]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleAprobar(itemId, 'anticipo', item);
                                    }}
                                    disabled={!cajaAbierta}
                                >
                                    <Text style={[styles.btnActionText, { color: '#FFFFFF' }]}>Entregar Efectivo</Text>
                                </Pressable>
                            )}
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </View>
            </Pressable>
        );
    };

    if (loading) {
        return <SolicitudesSkeleton bg={bg} cardBg={cardBg} borderColor={borderColor} insets={insets} isTablet={isTablet} gradientColors={gradientColors} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

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
                        <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#FFFFFF" }, isTablet && { fontSize: 28 }]}>
                            Solicitudes
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.8)" }, isTablet && { fontSize: 17 }]}>
                            {!cajaAbierta ? 'Caja cerrada' : 'Pendientes de aprobación'}
                        </Text>
                    </View>
                </View>
                
                {solicitudes.length > 0 && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={[styles.urgencyBar]}
                    >
                        <Ionicons name="warning" size={20} color="#FFFFFF" />
                        <Text style={styles.urgencyBarText}>
                            ATENCIÓN: {solicitudes.length} SOLICITUDES PENDIENTES
                        </Text>
                    </MotiView>
                )}
            </LinearGradient>

            <FlatList
                data={solicitudes}
                keyExtractor={item => item.id_unificado}
                renderItem={renderItem}
                extraData={nowTick}
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

            <Modal
                animationType="slide"
                transparent={true}
                visible={checkoutModalVisible}
                onRequestClose={() => setCheckoutModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <View style={[styles.checkoutModal, { backgroundColor: cardBg, borderColor }]}>
                        {selectedPedido && (
                            <>
                                <View style={styles.modalHeaderRow}>
                                    <View style={[styles.iconBox, { backgroundColor: accentBg }]}>
                                        <Ionicons name="card-outline" size={24} color={accentColor} />
                                    </View>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Cerrar Pedido</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>{selectedPedido.codigo}</Text>
                                    </View>
                                </View>

                                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                                    <View style={styles.optionsTitleContainer}>
                                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Resumen del Pedido</Text>
                                    </View>

                                    <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor }]}>
                                        {loadingDetails ? (
                                            <ActivityIndicator size="small" color={accentColor} style={{ marginVertical: 20 }} />
                                        ) : pedidoDetails.map((item: any, idx: number) => (
                                            <View key={idx} style={styles.productDetailRow}>
                                                <View style={[styles.productQuantityBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[styles.productQuantity, { color: textPrimary }]}>{item.cantidad}x</Text>
                                                </View>
                                                <View style={styles.productInfoCol}>
                                                    <Text style={[styles.productName, { color: textPrimary }]}>{item.nombre_producto || 'Producto'}</Text>
                                                    <Text style={[styles.productPrice, { color: textSecondary }]}>${(item.precio || 0).toLocaleString()}</Text>
                                                </View>
                                                <Text style={[styles.productSubtotal, { color: textPrimary }]}>${((item.precio || 0) * (item.cantidad || 0)).toLocaleString()}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.optionsTitleContainer}>
                                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Método de Pago</Text>
                                    </View>
                                    <View style={styles.paymentMethodsGrid}>
                                        {['efectivo', 'tarjeta', 'transferencia'].map((m: any) => (
                                            <Pressable
                                                key={m}
                                                style={[
                                                    styles.payMethodBtn,
                                                    { borderColor: metodoPago === m ? accentColor : borderColor },
                                                    metodoPago === m && { backgroundColor: accentBg }
                                                ]}
                                                onPress={() => setMetodoPago(m)}
                                            >
                                                <Ionicons name={m === 'efectivo' ? 'cash' : m === 'tarjeta' ? 'card' : 'swap-horizontal'} size={24} color={metodoPago === m ? accentColor : textSecondary} />
                                                <Text style={[styles.payMethodLabel, { color: metodoPago === m ? accentColor : textSecondary, textTransform: 'capitalize' }]}>{m}</Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    <Pressable 
                                        style={[styles.tipCheckboxContainer, { borderColor: agregarPropina ? accentColor : borderColor, backgroundColor: agregarPropina ? accentBg : 'transparent' }]}
                                        onPress={() => setAgregarPropina(!agregarPropina)}
                                    >
                                        <View style={[styles.checkbox, { borderColor: agregarPropina ? accentColor : textSecondary, backgroundColor: agregarPropina ? accentColor : 'transparent' }]}>
                                            {agregarPropina && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                        </View>
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.tipText, { color: textPrimary }]}>Sugerir Propina (10%)</Text>
                                            <Text style={[styles.tipSubText, { color: textSecondary }]}>+${(selectedPedido.total * 0.10).toLocaleString()}</Text>
                                        </View>
                                    </Pressable>

                                    <View style={[styles.totalsBox, { backgroundColor: accentBg }]}>
                                        <View style={styles.totalRow}>
                                            <Text style={[styles.totalLabel, { color: textSecondary }]}>Subtotal</Text>
                                            <Text style={[styles.totalValue, { color: textPrimary }]}>${(selectedPedido.total).toLocaleString()}</Text>
                                        </View>
                                        {agregarPropina && (
                                            <View style={[styles.totalRow, { marginTop: 4 }]}>
                                                <Text style={[styles.totalLabel, { color: textSecondary }]}>Propina (10%)</Text>
                                                <Text style={[styles.totalValue, { color: accentColor }]}>+${(selectedPedido.total * 0.10).toLocaleString()}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.totalRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: accentBorder, paddingTop: 12 }]}>
                                            <Text style={[styles.finalLabel, { color: textPrimary }]}>Monto Final</Text>
                                            <Text style={[styles.finalValue, { color: accentColor }]}>${(selectedPedido.total + (agregarPropina ? selectedPedido.total * 0.10 : 0)).toLocaleString()}</Text>
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
                                        style={[styles.modalBtnAction, { backgroundColor: accentColor, opacity: !metodoPago || submittingCheckout ? 0.6 : 1 }]}
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
                                    <View style={[styles.iconBox, { backgroundColor: accentBg }]}>
                                        <Ionicons name="receipt-outline" size={24} color={accentColor} />
                                    </View>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Servicio</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedService.codigo || '#' + selectedService.id_solicitud}</Text>
                                    </View>
                                </View>

                                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                                    <View style={styles.optionsTitleContainer}>
                                        <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: isTablet ? 18 : 13 }]}>Información</Text>
                                    </View>

                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="bed-outline" size={isTablet ? 24 : 20} color={accentColor} />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Habitación: {selectedService.habitacion_nombre}</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="person-outline" size={isTablet ? 24 : 20} color={accentColor} />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Solicitado por: {selectedService.solicitado_por_nombre}</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 8 }]}>
                                        <Ionicons name="people-outline" size={isTablet ? 24 : 20} color={accentColor} />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Anfitrionas ({selectedService.anfitrionas_ids?.length || 0}):</Text>
                                    </View>
                                    <View style={{ marginLeft: 8, marginBottom: 16 }}>
                                        {(() => {
                                            const anfsIds = Array.isArray(selectedService.anfitrionas_ids) ? selectedService.anfitrionas_ids : [];
                                            const numAnfs = anfsIds.length || 1;
                                            const comisionIndividual = (selectedService.comision_anfitriona || 0) > 0 
                                                ? Math.floor(selectedService.comision_anfitriona / numAnfs)
                                                : Math.floor(selectedService.precio_servicio || 0);

                                            const displayAnfs = (Array.isArray(selectedService.anfitrionas_con_nicks) && selectedService.anfitrionas_con_nicks.length > 0)
                                                ? selectedService.anfitrionas_con_nicks
                                                : anfsIds.map((id: any) => {
                                                        const found = allHostesses.find(h => String(h.id_usuario || h.id) === String(id));
                                                        return found ? found : { id, nick: `ID: ${id}`, nombre: 'Anfitriona', apellido: '' };
                                                    });

                                            return displayAnfs.length > 0 ? (
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isTablet ? 12 : 8 }}>
                                                    {displayAnfs.map((anf: any, idx: number) => (
                                                        <View key={idx} style={{ 
                                                            backgroundColor: accentBg,
                                                            paddingHorizontal: isTablet ? 16 : 12,
                                                            paddingVertical: isTablet ? 12 : 8,
                                                            borderRadius: 14,
                                                            borderWidth: 1,
                                                            borderColor: accentBorder,
                                                            flexDirection: 'row',
                                                            alignItems: 'center'
                                                        }}>
                                                            <View>
                                                                <Text style={{ color: textPrimary, fontSize: isTablet ? 16 : 13, fontWeight: '800' }}>{anf.nick || anf.nombre}</Text>
                                                                <Text style={{ color: '#10B981', fontSize: isTablet ? 15 : 12, fontWeight: '900' }}>+ ${comisionIndividual.toLocaleString('de-DE')}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : (
                                                <Text style={{ color: textSecondary, fontSize: isTablet ? 16 : 13, fontStyle: 'italic' }}>No hay información de anfitrionas</Text>
                                            );
                                        })()}
                                    </View>

                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="time-outline" size={isTablet ? 24 : 20} color={accentColor} />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Tiempo: {selectedService.tiempo} min</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 12 }]}>
                                        <Ionicons name="calendar-outline" size={isTablet ? 24 : 20} color={accentColor} />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Solicitado: {parseDateSafe(selectedService.fecha_solicitud).toLocaleDateString()} {parseDateSafe(selectedService.fecha_solicitud).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                    <View style={[styles.infoRow, { marginBottom: 20 }]}>
                                        <Ionicons name="card-outline" size={isTablet ? 24 : 20} color={accentColor} />
                                        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Método Pago: {selectedService.metodo_pago.toUpperCase()}</Text>
                                    </View>

                                    <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor, marginTop: 10, padding: isTablet ? 24 : 16 }]}>
                                        <View style={styles.productDetailRow}>
                                            <View style={styles.productInfoCol}>
                                                <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>Precio Servicio</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>${Math.floor((selectedService.precio_servicio || 0) * (selectedService.anfitrionas_ids?.length || 1)).toLocaleString('de-DE')}</Text>
                                        </View>
                                        <View style={styles.productDetailRow}>
                                            <View style={styles.productInfoCol}>
                                                <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>Precio Habitación</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>${Math.floor(selectedService.precio_habitacion || 0).toLocaleString('de-DE')}</Text>
                                        </View>
                                        {(selectedService.iva || 0) > 0 && (
                                            <View style={styles.productDetailRow}>
                                                <View style={styles.productInfoCol}>
                                                    <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>IVA / Ajuste Tarjeta</Text>
                                                </View>
                                                <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>${Math.floor(selectedService.iva || 0).toLocaleString('de-DE')}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.productDetailRow, { borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginTop: 8, paddingTop: 12 }]}>
                                            <View style={styles.productInfoCol}>
                                                <Text style={[styles.productName, { color: textPrimary, fontWeight: '800', fontSize: isTablet ? 22 : 16 }]}>TOTAL</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: accentColor, fontSize: isTablet ? 26 : 18, fontWeight: '900' }]}>${Math.floor(selectedService.total || 0).toLocaleString('de-DE')}</Text>
                                        </View>
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
    headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
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
        backgroundColor: '#E11D48',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginTop: 15,
        gap: 10,
        shadowColor: '#E11D48',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    urgencyBarText: {
        color: '#FFFFFF',
        fontSize: 13,
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
