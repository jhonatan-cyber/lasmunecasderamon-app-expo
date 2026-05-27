﻿import { Ionicons } from '@expo/vector-icons';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useState } from 'react';
import {
    DeviceEventEmitter,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { MetodoPago } from '../../../types/api';

// API & Utils
import { apiClient } from '@/api/client';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';

// New Refactored Components & Hook
import { CheckoutModal } from '@/components/cajero/CheckoutModal';
import { ServiceModal } from '@/components/cajero/ServiceModal';
import { SolicitudCard } from '@/components/cajero/SolicitudCard';
import { useSolicitudes } from '@/hooks/useSolicitudes';

const FlashList = ShopifyFlashList as any;

const SolicitudesSkeleton = ({ bg, cardBg, borderColor, insets, isTablet, gradientColors }: any) => (
    <View style={{ flex: 1, backgroundColor: bg }}>
        <LinearGradient
            colors={gradientColors as any}
            style={[{ paddingTop: insets.top + (isTablet ? 20 : 10), height: 160, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={150} height={30} />
                <Skeleton width={44} height={44} borderRadius={22} />
            </View>
            <Skeleton width="60%" height={24} />
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.cardSkeleton, { backgroundColor: cardBg, borderColor, padding: 20 }]}>
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
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const numColumns = isTablet ? 2 : 1;
    const { openId, type: queryType } = useLocalSearchParams();

    // Custom Hook logic
    const {
        solicitudes,
        loading,
        refreshing,
        cajaAbierta,
        allHostesses,
        fetchSolicitudes,
        onRefresh,
        pendingAutoOpen,
        setPendingAutoOpen,
        serverOffset,
        removeSolicitudLocally,
        isOffline
    } = useSolicitudes();

    // Styles & Theme
    const { 
        accentColor, 
        gradientColors, 
        isDark, 
        accentBg, 
        accentBorder,
        bg,
        cardBg,
        textPrimary,
        textSecondary,
        borderColor
    } = useAccentColor();

    // State for modals and selections
    const [processedOpenId, setProcessedOpenId] = useState<string | null>(null);
    const [nowTick, setNowTick] = useState(0);
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<any>(null);
    const [pedidoDetails, setPedidoDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingClient, setLoadingClient] = useState(false);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | ''>('');
    const [metodoPagoAdicional, setMetodoPagoAdicional] = useState<MetodoPago>('');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [agregarPropina, setAgregarPropina] = useState(false);
    const [selectedMinutesPedido, setSelectedMinutesPedido] = useState<number>(30); 
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);

    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000
        });
    };

    // --- LOGIC HANDLERS ---

    const handleAprobar = useCallback(async (id: string, tipo: string, itemInfo?: any) => {
        console.log('[handleAprobar] id:', id, 'tipo:', tipo, 'itemInfo:', itemInfo);
        if (!cajaAbierta) {
            showToast('Caja Cerrada', 'No puedes aprobar servicios ni pedidos porque no hay una caja abierta.', 'error');
            return;
        }

        if (tipo === 'pedido' && itemInfo) {
            console.log('[handleAprobar] pedido itemInfo keys:', Object.keys(itemInfo), 'id_pedido:', itemInfo.id_pedido);
            setSelectedPedido(itemInfo);
            setMetodoPago('');
            setMetodoPagoAdicional('');
            setAgregarPropina(false);
            setCheckoutModalVisible(true);
            setLoadingDetails(true);
            setSelectedMinutesPedido(30);

            try {
                const res = await apiClient(`/orders/detail?id=${id}`);
                console.log('[handleAprobar] Order detail:', res.data?.[0]);
                if (res.success) {
                    setPedidoDetails(res.data);
                    const cId = res.data?.[0]?.cliente_id || itemInfo.id_cliente || itemInfo.cliente_id;
                    console.log('[handleAprobar] cliente_id:', cId);
                    if (cId) {
                        const cRes = await apiClient(`/clients?id=${cId}`).catch(() => ({ success: false }));
                        console.log('[handleAprobar] Client response:', cRes.data);
                        if (cRes.success && cRes.data) {
                            setSelectedClient(cRes.data);
                            console.log('[handleAprobar] Client saldo:', cRes.data.saldo);
                            if (Number(cRes.data.saldo || 0) > 0) setMetodoPago('prepago');
                        }
                    } else {
                        console.log('[handleAprobar] No cliente_id, cliente no asignado');
                        setSelectedClient(null);
                    }
                    if (res.data?.[0]?.propina > 0) setAgregarPropina(true);
                } else {
                    showToast('Error', 'No se pudieron cargar los detalles', 'error');
                    setCheckoutModalVisible(false);
                }
            } catch {
                showToast('Error', 'No se pudieron cargar los detalles', 'error');
                setCheckoutModalVisible(false);
            } finally {
                setLoadingDetails(false);
            }
            return;
        }

        if (tipo === 'anticipo') {
            const anticipoEstado = Number(itemInfo?.estado);
            const requiereAprobacion = anticipoEstado === 2;
            setAlertConfig({
                visible: true,
                title: requiereAprobacion ? 'Aprobar y Pagar Anticipo' : 'Pagar Anticipo',
                message: `¿Confirmas que has entregado el efectivo de $${itemInfo.monto.toLocaleString()} a ${itemInfo.usuario}?`,
                type: 'success',
                onConfirm: async () => {
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                    try {
                        if (requiereAprobacion) {
                            const approveRes = await apiClient(`/anticipos/${id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ estado: 1 })
                            });

                            if (!approveRes.success) {
                                showToast('Error', approveRes.message || 'No se pudo aprobar el anticipo.', 'error');
                                fetchSolicitudes();
                                return;
                            }
                        }

                        const res = await apiClient(`/anticipos/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ estado: 0 })
                        });
                        if (res.success) {
                            removeSolicitudLocally(id, 'anticipo');
                            showToast('Éxito', 'Anticipo entregado y descontado de caja.', 'success');
                            DeviceEventEmitter.emit('refresh_requests');
                            DeviceEventEmitter.emit('refresh_anticipos');
                        } else {
                            showToast('Error', res.message || 'Error al procesar.', 'error');
                            fetchSolicitudes();
                        }
                    } catch (err: any) {
                        showToast('Error', err.message || 'Error del servidor', 'error');
                        fetchSolicitudes();
                    }
                }
            });
            return;
        }

        // Caso: Aprobación de Servicio
        if (tipo === 'solicitud') {
            const executeAprobacion = async () => {
                removeSolicitudLocally(id, 'solicitud');
                try {
                    const res = await apiClient(`/solicitudes-servicios/${id}/aprobar`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            metodo_pago: metodoPago || itemInfo?.metodo_pago || 'efectivo',
                            metodo_pago_adicional: metodoPagoAdicional || undefined
                        })
                    });

                    if (res.success) {
                        showToast('Éxito', 'Servicio aprobado correctamente.', 'success');
                        DeviceEventEmitter.emit('refresh_requests');
                        setMetodoPago('');
                        setMetodoPagoAdicional('');
                        setServiceModalVisible(false);
                    } else {
                        showToast('Error', res.message || 'No se pudo aprobar.', 'error');
                        fetchSolicitudes();
                    }
                } catch (err: any) {
                    showToast('Error', err.message || 'Error del servidor', 'error');
                    fetchSolicitudes();
                }
            };

            // Si viene de un modal (selectedService existe) o ya tiene método, aprobamos directo.
            // Si viene de la card (clic rápido), pedimos confirmación.
            if (serviceModalVisible) {
                executeAprobacion();
            } else {
                setAlertConfig({
                    visible: true,
                    title: 'Aprobar Servicio',
                    message: `¿Confirmas la aprobación del servicio en la ${itemInfo?.habitacion_nombre || 'habitación'}?`,
                    type: 'success',
                    onConfirm: () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        executeAprobacion();
                    }
                });
            }
        }
    }, [cajaAbierta, fetchSolicitudes, metodoPago, metodoPagoAdicional, removeSolicitudLocally, serviceModalVisible]);

    const handleRechazar = (id: string, tipo: string) => {
        setAlertConfig({
            visible: true,
            title: 'Rechazar',
            message: `¿Seguro que deseas rechazar este ${tipo === 'solicitud' ? 'servicio' : 'pedido'}?`,
            type: 'danger',
            onConfirm: async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                removeSolicitudLocally(id, tipo === 'solicitud' ? 'solicitud' : 'pedido');
                try {
                    const endpoint = tipo === 'solicitud' ? `/solicitudes-servicios/${id}/rechazar` : `/orders/${id}`;
                    const res = await apiClient(endpoint, {
                        method: tipo === 'solicitud' ? 'PATCH' : 'PUT',
                        body: JSON.stringify(tipo === 'solicitud' ? { motivo_rechazo: 'Caja' } : { estado: 2 })
                    });
                    if (res.success) {
                        showToast('Éxito', 'Solicitud eliminada.', 'success');
                        DeviceEventEmitter.emit('refresh_requests');
                    } else {
                        showToast('Error', 'No se pudo rechazar.', 'error');
                        fetchSolicitudes();
                    }
                } catch (err: any) {
                    showToast('Error', err.message || 'Error del servidor', 'error');
                    fetchSolicitudes();
                }
            }
        });
    };

    const handleCheckoutSubmit = async () => {
        if (!selectedPedido) return;
        setSubmittingCheckout(true);
        
        const propinaOriginal = Number(selectedPedido.propina || pedidoDetails?.[0]?.propina || 0);
        const subtotalBase = Number(
            selectedPedido.subtotal ?? Math.max(0, Number(selectedPedido.total || 0) - propinaOriginal)
        );
        const propinaFinal = propinaOriginal > 0 ? propinaOriginal : (agregarPropina ? subtotalBase * 0.10 : 0);
        const totalConPropina = subtotalBase + propinaFinal;
        const saldoPrepago = selectedClient ? Number(selectedClient.saldo || 0) : 0;
        
        // Calcular monto prepago - solo si hay cliente con saldo
        let montoPrepago = 0;
        if (metodoPago === 'prepago' && selectedClient && saldoPrepago > 0) {
            montoPrepago = Math.min(totalConPropina, saldoPrepago);
        }
        
        const clienteId = selectedPedido.cliente_id || pedidoDetails?.[0]?.cliente_id || selectedClient?.id || null;
        
        const payload: {
            id_pedido: any;
            cliente_id: any;
            metodo_pago: typeof metodoPago;
            metodo_pago_adicional: typeof metodoPagoAdicional | undefined;
            monto_prepago: number;
            duracion_habitacion: number;
            detalles: {
                producto_id: any;
                cantidad: any;
                precio: any;
                sub_total: number;
            }[];
            sub_total: any;
            total: any;
            ganancia_tipo: 'fijo';
            ganancia_monto: number;
            comision_por_cliente: boolean;
            recompensa_binario: boolean;
            recompensa_activos: boolean;
            recompensa_activos_monto: number;
            ganancia_anfitriona: number;
            ganancia_garzon: number;
            ganancia_local: number;
            ganancia_empresa: number;
            total_comision: number;
            tiempo: number;
            usuarios: never[];
            propina?: number;
        } = {
            id_pedido: selectedPedido.id_pedido,
            cliente_id: clienteId,
            metodo_pago: metodoPago,
            metodo_pago_adicional: metodoPagoAdicional || undefined,
            monto_prepago: montoPrepago,
            duracion_habitacion: selectedMinutesPedido,
            // Datos requeridos por el schema
            detalles: pedidoDetails.map((d: any) => ({
                producto_id: d.producto_id,
                cantidad: d.cantidad,
                precio: d.precio,
                sub_total: d.subtotal_detalle || (d.cantidad * d.precio)
            })),
            sub_total: subtotalBase,
            total: totalConPropina,
            ganancia_tipo: 'fijo',
            ganancia_monto: 0,
            comision_por_cliente: false,
            recompensa_binario: false,
            recompensa_activos: false,
            recompensa_activos_monto: 0,
            // Propina calculada
            ganancia_anfitriona: 0,
            ganancia_garzon: 0,
            ganancia_local: 0,
            ganancia_empresa: 0,
            total_comision: 0,
            tiempo: selectedMinutesPedido,
            usuarios: []
        };
        
        // Agregar propina si aplica
        if (propinaFinal > 0) {
            payload.propina = propinaFinal;
        }
        
        try {
            const res = await apiClient(`/sales`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.success) {
                showToast('Éxito', 'Pedido cobrado y cerrado.', 'success');
                removeSolicitudLocally(selectedPedido.id_pedido, 'pedido');
                setCheckoutModalVisible(false);
                DeviceEventEmitter.emit('refresh_requests');
            } else {
                showToast('Error', res.message || 'Error al procesar', 'error');
                fetchSolicitudes();
            }
        } catch (err: any) {
            showToast('Error', err.message || 'Error base de datos', 'error');
            fetchSolicitudes();
        } finally {
            setSubmittingCheckout(false);
        }
    };

    const handleAddToCuenta = async () => {
        if (!selectedPedido || !selectedClient) return;
        if (!cajaAbierta) {
            showToast('Caja Cerrada', 'No puedes crear cuentas sin una caja abierta.', 'error');
            return;
        }

        setSubmittingCheckout(true);

        try {
            // Crear cuenta con los productos del pedido
            const clienteId = selectedPedido.cliente_id || pedidoDetails?.[0]?.cliente_id || selectedClient?.id || null;
            const habitacionId = pedidoDetails?.[0]?.habitacion_id || null;
            
            // Calcular totales
            const detalles = pedidoDetails.map((d: any) => ({
                producto_id: d.producto_id,
                cantidad: d.cantidad,
                precio: d.precio,
                sub_total: (d.cantidad * d.precio)
            }));
            
            const subTotal = detalles.reduce((sum: number, d: any) => sum + d.sub_total, 0);
            const total = subTotal; // Sin comisión para cuenta

            const payload = {
                codigo: `CUENTA-${Date.now()}`,
                cliente_id: clienteId,
                habitacion_id: habitacionId,
                tiempo: selectedMinutesPedido || 30,
                metodo_pago: 'efectivo',
                sub_total: subTotal,
                total: total,
                total_comision: 0,
                detalles: detalles
            };

            const res = await apiClient('/cuentas', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.success) {
                showToast('Éxito', `Pedido registrado en cuenta de ${selectedClient.name} ${selectedClient.lastName}`, 'success');
                removeSolicitudLocally(selectedPedido.id_pedido, 'pedido');
                setCheckoutModalVisible(false);
                DeviceEventEmitter.emit('refresh_requests');
            } else {
                showToast('Error', res.message || 'Error al crear la cuenta', 'error');
                fetchSolicitudes();
            }
        } catch (err: any) {
            showToast('Error', err.message || 'Error al procesar', 'error');
            fetchSolicitudes();
        } finally {
            setSubmittingCheckout(false);
        }
    };

    // --- EFFECTS ---

    // Limpiar pendingAutoOpen al montar el componente para evitar auto-open no deseado
    useEffect(() => {
        console.log('[useEffect mount] Limpiando pendingAutoOpen');
        setPendingAutoOpen(null);
    }, [setPendingAutoOpen]);

    // Now tick for timers
    useEffect(() => {
        const tid = setInterval(() => setNowTick(t => t + 1), 1000);
        return () => clearInterval(tid);
    }, []);

    // handle query params (Navigation from depth)
    useEffect(() => {
        console.log('[useEffect queryParams] openId:', openId, 'queryType:', queryType, 'solicitudes.length:', solicitudes.length);
        if (openId && queryType && solicitudes.length > 0) {
            const id = openId as string;
            if (id === processedOpenId) return;

            const found = solicitudes.find(s =>
                (queryType === 'new_order' && s.tipoItem === 'pedido' && s.id_pedido === id) ||
                (queryType === 'new_service_request' && s.tipoItem === 'solicitud' && s.id_solicitud === id)
            );

            if (found) {
                console.log('[useEffect queryParams] found:', found);
                setProcessedOpenId(id);
                router.setParams({ openId: undefined, type: undefined });
                if (queryType === 'new_order') {
                    handleAprobar(id, 'pedido', found);
                } else {
                    setSelectedService(found);
                    setServiceModalVisible(true);
                }
            }
        }
    }, [openId, queryType, solicitudes, processedOpenId, handleAprobar, router]);

    // Handle auto-opening from SSE (via Hook)
    useEffect(() => {
        console.log('[useEffect pendingAutoOpen] pendingAutoOpen:', pendingAutoOpen, 'solicitudes.length:', solicitudes.length, 'typeof id:', typeof pendingAutoOpen?.id);
        // Solo procesar si hay un ID válido
        if (!pendingAutoOpen || !pendingAutoOpen.id || pendingAutoOpen.id === 'undefined' || pendingAutoOpen.id === undefined || !solicitudes.length) {
            console.log('[useEffect pendingAutoOpen] âŒ Returning early - invalid id');
            return;
        }
        
        const { id, type } = pendingAutoOpen;
        console.log('[useEffect pendingAutoOpen] id:', id, 'type:', type);
        const found = solicitudes.find(s =>
            (type === 'pedido' && s.tipoItem === 'pedido' && s.id_pedido === id) ||
            (type === 'solicitud' && s.tipoItem === 'solicitud' && s.id_solicitud === id)
        );
        console.log('[useEffect pendingAutoOpen] found:', found);

        if (found) {
            setPendingAutoOpen(null);
            if (type === 'pedido') {
                handleAprobar(id, 'pedido', found);
            } else {
                setSelectedService(found);
                setServiceModalVisible(true);
            }
        } else {
            // Si no se encontró, limpiar el pendingAutoOpen para evitar bucles
            console.log('[useEffect pendingAutoOpen] no found, clearing...');
            setPendingAutoOpen(null);
        }
    }, [solicitudes, pendingAutoOpen, handleAprobar, setPendingAutoOpen]);

    // Fetch client when service modal opens
    useEffect(() => {
        if (serviceModalVisible && selectedService) {
            const cId = selectedService.cliente_id || selectedService.id_cliente;
            if (cId) {
                setLoadingClient(true);
                apiClient(`/clients?id=${cId}`).then(res => {
                    if (res.success) setSelectedClient(res.data);
                }).catch(() => setSelectedClient(null))
                  .finally(() => setLoadingClient(false));
            } else {
                setSelectedClient(null);
            }
        }
    }, [serviceModalVisible, selectedService]);

    if (loading) {
        return <SolicitudesSkeleton bg={bg} cardBg={cardBg} borderColor={borderColor} insets={insets} isTablet={isTablet} gradientColors={gradientColors} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader
                title="Solicitudes"
                subtitle={!cajaAbierta ? 'Caja cerrada' : 'Pendientes de aprobación'}
                connectionStatus={{ 
                    isConnected: !isOffline, 
                    label: isOffline ? 'Modo Offline' : 'En Línea' 
                }}
                rightComponent={
                    <View style={styles.headerActions}>
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextRight}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            {isOffline && (
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={[styles.offlineBanner, { backgroundColor: '#EF4444' }]}
                >
                    <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
                    <Text style={styles.offlineBannerText}>MODO OFFLINE - VIENDO DATOS GUARDADOS</Text>
                </MotiView>
            )}

            {solicitudes.length > 0 && !isOffline && (
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.urgencyBar, { backgroundColor: accentColor, margin: 16, marginBottom: 0 }]}
                >
                    <Ionicons name="warning" size={20} color="#FFFFFF" />
                    <Text style={styles.urgencyBarText}>
                        ATENCIÓN: {solicitudes.length} SOLICITUDES PENDIENTES
                    </Text>
                </MotiView>
            )}

            <FlashList
                data={solicitudes}
                keyExtractor={(item: any) => item.id_unificado}
                renderItem={({ item }: { item: any }) => (
                    <View
                        style={[
                            styles.cardWrapper,
                            numColumns > 1 && styles.cardWrapperGrid,
                        ]}
                    >
                        <SolicitudCard 
                            item={item}
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            cardBg={cardBg}
                            borderColor={borderColor}
                            serverOffset={serverOffset}
                            cajaAbierta={cajaAbierta}
                            onAprobar={handleAprobar}
                            onRechazar={handleRechazar}
                            onShowServiceModal={(si) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setSelectedService(si);
                                setServiceModalVisible(true);
                            }}
                            nowTick={nowTick}
                        />
                    </View>
                )}
                extraData={nowTick}
                estimatedItemSize={120}
                numColumns={numColumns}
                columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
                contentContainerStyle={styles.listContainer}
                drawDistance={500}
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

            <CheckoutModal 
                visible={checkoutModalVisible}
                onClose={() => setCheckoutModalVisible(false)}
                selectedPedido={selectedPedido}
                pedidoDetails={pedidoDetails}
                loadingDetails={loadingDetails}
                selectedClient={selectedClient}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                metodoPagoAdicional={metodoPagoAdicional}
                setMetodoPagoAdicional={setMetodoPagoAdicional}
                agregarPropina={agregarPropina}
                setAgregarPropina={setAgregarPropina}
                selectedMinutesPedido={selectedMinutesPedido}
                setSelectedMinutesPedido={setSelectedMinutesPedido}
                submittingCheckout={submittingCheckout}
                onCheckoutSubmit={handleCheckoutSubmit}
                onAddToCuenta={handleAddToCuenta}
                isDark={isDark}
                accentColor={accentColor}
                accentBg={accentBg}
                accentBorder={accentBorder}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
                cardBg={cardBg}
            />

            <ServiceModal 
                visible={serviceModalVisible}
                onClose={() => setServiceModalVisible(false)}
                selectedService={selectedService}
                selectedClient={selectedClient}
                loadingClient={loadingClient}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                metodoPagoAdicional={metodoPagoAdicional}
                setMetodoPagoAdicional={setMetodoPagoAdicional}
                allHostesses={allHostesses}
                onAprobar={handleAprobar}
                isDark={isDark}
                isTablet={isTablet}
                accentColor={accentColor}
                accentBg={accentBg}
                accentBorder={accentBorder}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
                cardBg={cardBg}
            />

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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtnRight: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 38, 
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextRight: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    listContainer: { padding: 16, paddingBottom: 100 },
    cardWrapper: { paddingBottom: 16 },
    cardWrapperGrid: { flex: 1, paddingHorizontal: 8 },
    columnWrapper: { marginHorizontal: -8 },
    cardSkeleton: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16 },
    emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 40, borderStyle: 'dashed' },
    emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    emptySub: { fontSize: 14, fontWeight: '500' },
    urgencyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 10,
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
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 10,
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        elevation: 4,
    },
    offlineBannerText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

