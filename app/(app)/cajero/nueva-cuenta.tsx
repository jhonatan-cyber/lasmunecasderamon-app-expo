import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { CartList } from "@/components/cajero/forms/CartList";
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';
import logger from '@/utils/logger';

import {
    CategorySelector,
    NewAccountForm,
    NewAccountSummary,
    NuevaCuentaModales,
    initialCuentaState,
    cuentaReducer
} from '@/components/cajero/nueva-cuenta';

const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    Toast.show({
        type,
        text1: title,
        text2: message,
        visibilityTime: 4000,
    });
};

const isChampagneProduct = (producto: any) => {
    const cat = (producto.categoria || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
};

const getChampagneLimit = (precio: number) => {
    if (precio >= 240000) return 5;
    if (precio >= 200000) return 4;
    if (precio >= 160000) return 3;
    if (precio >= 120000) return 2;
    return 1;
};

const getHostessLimit = (prod: any, qty: number) => {
    const price = prod.precio ?? prod.price ?? 0;
    if (isChampagneProduct(prod)) {
        return getChampagneLimit(price) * qty;
    }
    return qty;
};

const buildCommissionPreview = (items: any[], hostesses: any[]) => {
    const totalCommission = items.reduce((acc, item) => acc + (Number(item.comision || 0) * Number(item.cantidad || 0)), 0);
    const distribution = new Map<string, { id: string; name: string; amount: number }>();

    const addAmount = (hostessId: string | number, amount: number) => {
        if (!hostessId || amount <= 0) return;
        const key = String(hostessId);
        const hostess = hostesses.find((item: any) => String(item.id_usuario || item.id) === key);
        const current = distribution.get(key);
        distribution.set(key, {
            id: key,
            name: hostess?.nick || `Anfitriona ${key}`,
            amount: (current?.amount || 0) + amount,
        });
    };

    items.forEach((item) => {
        const selectedHostesses = Array.isArray(item.selectedHostesses) ? item.selectedHostesses.filter(Boolean) : [];
        const itemCommission = Number(item.comision || 0) * Number(item.cantidad || 0);

        if (itemCommission <= 0 || selectedHostesses.length === 0) return;

        if (item.isChampagne) {
            const totalRounded = Math.round(itemCommission);
            const base = Math.floor(totalRounded / selectedHostesses.length);
            const remainder = totalRounded % selectedHostesses.length;

            selectedHostesses.forEach((hostessId: string | number, index: number) => {
                addAmount(hostessId, base + (index === 0 ? remainder : 0));
            });
            return;
        }

        selectedHostesses.forEach((hostessId: string | number) => {
            addAmount(hostessId, itemCommission);
        });
    });

    return {
        totalCommission,
        assignedCommission: Array.from(distribution.values()).reduce((acc, item) => acc + item.amount, 0),
        hostessDistribution: Array.from(distribution.values()).sort((a, b) => b.amount - a.amount),
    };
};

export default function NuevaCuentaScreen() {
    const { accentColor, isDark } = useAccentColor();
    const router = useRouter();

    const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);
    const {
        loadingInitial, refreshing, anfitrionas, habitaciones, clientes, cajaAbierta,
        cart, selectedCliente, selectedHabitacion, categories, modalOpen, modalCategoria,
        modalProducts, modalLoading, modalQuantities, modalHostessSelections, hostessSelectionTarget,
        hostessSubModalVisible, roomModalVisible, clientModalVisible,
        submitting
    } = state;

    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    const spacing = isTablet ? 24 : 16;

    const dynamicStyles = {
        scrollContent: { padding: spacing, paddingBottom: 100 },
    };

    const fetchInitialData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
        try {
            const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] = await Promise.all([
                apiClient('/cashregister/status'),
                apiClient('/anfitrionas'),
                apiClient('/rooms'),
                apiClient('/clients'),
                apiClient('/categories'),
            ]);

            const rawHabitaciones = roomsRes.success ? roomsRes.data : [];
            const fetchedData: any = {
                cajaAbierta: cajaRes.success && cajaRes.data.hasOpenCaja,
                anfitrionas: Array.isArray(anfitrionasRes) ? anfitrionasRes : (anfitrionasRes.success ? anfitrionasRes.data : []),
                habitaciones: rawHabitaciones.map((room: any) => ({
                    ...room,
                    nombre: room.nombre ?? room.name ?? `Habitación ${room.id_habitacion ?? room.id ?? ''}`.trim(),
                    precio: room.precio ?? room.price ?? 0,
                    tiempo: room.tiempo ?? room.time ?? 0,
                    estado: room.estado ?? room.status ?? 0,
                    comision_anfitriona: room.comision_anfitriona ?? 0,
                })),
                categories: categoriesRes.success ? (categoriesRes.data || []) : []
            };

            if (Array.isArray(clientsRes)) {
                fetchedData.clientes = clientsRes;
            } else if (clientsRes && clientsRes.success) {
                fetchedData.clientes = clientsRes.data || [];
            }

            dispatch({ type: 'SET_INITIAL_DATA', payload: fetchedData });

            if (!cajaRes.success || !cajaRes.data.hasOpenCaja) {
                showToast('Caja Cerrada', 'Debes abrir una caja antes de registrar consumos.', 'error');
            }
        } catch (error) {
            logger.captureException(error, { context: 'NuevaCuenta:createCuenta' });
            showToast('Error', 'No se pudo cargar la información necesaria.');
        } finally {
            dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchInitialData(true);
    }, [fetchInitialData]);

    const handleOpenCategory = useCallback(async (cat: any) => {
        dispatch({ type: 'SET_MODAL_LOADING', payload: true });
        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: true });
        try {
            const res = await apiClient(`/products?category_id=${cat.id}`);
            if (res.success) {
                dispatch({ type: 'OPEN_CATEGORY_MODAL', category: cat, products: res.data || [] });
            } else {
                showToast('Error', 'No se pudieron cargar los productos');
            }
        } catch (error) {
            logger.captureException(error, { context: 'NuevaCuenta:handleOpenCategory' });
        } finally {
            dispatch({ type: 'SET_MODAL_LOADING', payload: false });
        }
    }, []);

    const addProductToCart = useCallback((prod: any) => {
        const id = prod.id || prod.id_producto;
        const totalQty = modalQuantities[id] || 1;
        const selectedHostesses = modalHostessSelections[id] || [];

        const price = prod.precio ?? prod.price ?? 0;
        const comm = prod.comision ?? prod.commission ?? 0;

        const newCart = [...cart];

        const hostessNames = selectedHostesses.length > 0
            ? selectedHostesses.map((hId: number | string) => anfitrionas.find((a: any) => String(a.id_usuario || a.id) === String(hId))?.nick || '').filter(Boolean).join(', ')
            : null;

        const existingItemIndex = newCart.findIndex((item) => {
            const itemId = item.id_producto || item.id;
            const currentH = item.selectedHostesses || [];
            const sortedCurrent = [...currentH].sort().join(',');
            const sortedNew = [...selectedHostesses].sort().join(',');
            return itemId === id && sortedCurrent === sortedNew;
        });

        if (existingItemIndex >= 0) {
            newCart[existingItemIndex].cantidad += totalQty;
            newCart[existingItemIndex].subtotal = price * newCart[existingItemIndex].cantidad;
        } else {
            newCart.push({
                id_producto: id,
                nombre: prod.nombre || prod.name || 'Producto',
                precio: price,
                comision: comm,
                cantidad: totalQty,
                subtotal: price * totalQty,
                selectedHostesses: selectedHostesses,
                hostessNames: hostessNames || null,
                isChampagne: isChampagneProduct(prod),
            });
        }

        dispatch({ type: 'SET_CART', payload: newCart });
        showToast('Agregado', `${prod.nombre || prod.name} sumado a la cuenta`, 'success');
    }, [cart, modalQuantities, modalHostessSelections, anfitrionas]);

    const totals = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
        const totalComision = cart.reduce((acc, item) => acc + item.comision * item.cantidad, 0);
        return { subtotal, totalComision, total: subtotal };
    }, [cart]);

    const commissionPreview = useMemo(
        () => buildCommissionPreview(cart, anfitrionas),
        [cart, anfitrionas]
    );

    const generateCodigo = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleSubmit = useCallback(async () => {
        if (!cajaAbierta) {
            showToast('Error', 'La caja está cerrada.');
            return;
        }
        if (!selectedCliente) {
            showToast('Error', 'Debes seleccionar un cliente.');
            return;
        }
        if (cart.length === 0) {
            showToast('Error', 'La cuenta está vacía.');
            return;
        }

        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            const selectedRoomId =
                selectedHabitacion?.id_habitacion ||
                selectedHabitacion?.id ||
                null;
            const selectedRoomTime = Number(
                selectedHabitacion?.tiempo ??
                selectedHabitacion?.time ??
                0
            );
            const selectedRoomCommission = Number(selectedHabitacion?.comision_anfitriona || 0);

            const cuentaData = {
                codigo: generateCodigo(),
                cliente_id: selectedCliente?.id || selectedCliente?.id_cliente,
                habitacion_id: selectedRoomId,
                tiempo:
                    selectedRoomId
                        ? selectedRoomCommission === 0
                            ? state.selectedTime
                            : selectedRoomTime
                        : 0,
                total_comision: totals.totalComision,
                sub_total: totals.subtotal,
                total: totals.total,
                detalles: cart.map((item) => ({
                    producto_id: item.id_producto || item.id,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    sub_total: item.precio * item.cantidad,
                    comision: item.comision * (item.cantidad || 1),
                    hostesses: item.selectedHostesses,
                    isChampagne: item.isChampagne
                })),
                usuarios: [...new Set(cart.flatMap(item => item.selectedHostesses || []).filter(h => h !== null))]
            };

            const res = await apiClient('/cuentas', {
                method: 'POST',
                body: JSON.stringify(cuentaData),
            });

            if (res.success) {
                showToast('Éxito', 'Cuenta registrada correctamente', 'success');
                setTimeout(() => router.replace('/cajero/cuentas'), 1500);
            } else {
                showToast('Error', res.message || 'No se pudo crear la cuenta');
            }
        } catch (error) {
            logger.captureException(error, { context: 'NuevaCuenta:createCuenta' });
            showToast('Error', 'Ocurrió un error al procesar la cuenta.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [cajaAbierta, selectedCliente, selectedHabitacion, cart, totals, router, state.selectedTime]);

    const renderNuevaCuentaSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <PremiumHeader
                title="Nueva Cuenta"
                subtitle="Cargando información..."
                rightComponent={
                    <View style={[styles.backBtnRight, { opacity: 0.5 }]}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backTextRight}>Atrás</Text>
                    </View>
                }
            />
            <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
                <View style={styles.browserContainer}>
                    <Skeleton width={200} height={20} style={{ marginBottom: 16 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} width={140} height={64} borderRadius={20} />
                        ))}
                    </View>
                </View>

                <View style={[styles.sectionSkeleton, { backgroundColor: cardBg, borderColor }]}>
                    <Skeleton width={150} height={18} style={{ marginBottom: 15 }} />
                    <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 12 }} />
                    <Skeleton width="100%" height={56} borderRadius={16} />
                </View>

                <View style={[styles.summaryCardSkeleton, { backgroundColor: cardBg, borderColor }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                        <Skeleton width={100} height={18} />
                        <Skeleton width={80} height={18} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 15 }}>
                        <Skeleton width={120} height={24} />
                        <Skeleton width={100} height={32} />
                    </View>
                    <Skeleton width="100%" height={60} borderRadius={20} />
                </View>
            </ScrollView>
        </View>
    );

    if (loadingInitial) return renderNuevaCuentaSkeleton();

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bg }]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader
                title="Nueva Cuenta"
                subtitle="Aperturar cuenta"
                rightComponent={
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backBtnRight}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backTextRight}>Atrás</Text>
                    </Pressable>
                }
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <CategorySelector
                    categories={categories}
                    handleOpenCategory={handleOpenCategory}
                    accentColor={accentColor}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                />

                {cart.length > 0 && (
                    <CartList
                        items={cart}
                        title="Listado de Consumo"
                        onUpdateQuantity={(idx: number, delta: number) => {
                            const newCart = [...cart];
                            newCart[idx].cantidad = Math.max(1, newCart[idx].cantidad + delta);
                            newCart[idx].subtotal = newCart[idx].precio * newCart[idx].cantidad;
                            dispatch({ type: 'SET_CART', payload: newCart });
                        }}
                        onRemove={(idx: number) => {
                            const newCart = [...cart];
                            newCart.splice(idx, 1);
                            dispatch({ type: 'SET_CART', payload: newCart });
                        }}
                    />
                )}

                <NewAccountForm
                    selectedCliente={selectedCliente}
                    selectedHabitacion={selectedHabitacion}
                    selectedTime={state.selectedTime}
                    totalComision={totals.totalComision}
                    onOpenModal={(modalName) => dispatch({ type: 'SET_MODAL_VISIBLE', modal: modalName, visible: true })}
                    accentColor={accentColor}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                    isTablet={isTablet}
                />

                <NewAccountSummary
                    totals={totals}
                    commissionPreview={commissionPreview}
                    submitting={submitting}
                    handleSubmit={handleSubmit}
                    accentColor={accentColor}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                    isTablet={isTablet}
                />
            </ScrollView>

            <NuevaCuentaModales
                clientModalVisible={state.clientModalVisible}
                clientes={clientes}
                selectedCliente={selectedCliente}
                onCloseClient={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false })}
                onSelectCliente={(client) => dispatch({ type: 'SET_SELECTED_CLIENTE', payload: client })}

                roomModalVisible={state.roomModalVisible}
                habitaciones={habitaciones}
                selectedHabitacion={selectedHabitacion}
                onCloseRoom={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false })}
                onSelectHabitacion={(room) => dispatch({ type: 'SET_SELECTED_HABITACION', payload: room })}

                hostessSubModalVisible={hostessSubModalVisible}
                hostessSelectionTarget={hostessSelectionTarget}
                anfitrionas={anfitrionas}
                modalHostessSelections={modalHostessSelections}
                onToggleHostess={(id) => {
                    if (!hostessSelectionTarget) return;
                    const pid = hostessSelectionTarget.productId;
                    const currentSelected = modalHostessSelections[pid] || [];
                    let newSelected;

                    const strId = String(id);
                    if (currentSelected.some(x => String(x) === strId)) {
                        newSelected = currentSelected.filter(x => String(x) !== strId);
                    } else {
                        if (hostessSelectionTarget.max && currentSelected.length >= hostessSelectionTarget.max) {
                            showToast('Límite', `Máximo ${hostessSelectionTarget.max} anfitrionas por esta cantidad`, 'error');
                            return;
                        }
                        newSelected = [...currentSelected, strId];
                    }
                    dispatch({ type: 'SET_MODAL_HOSTESSES', productId: pid, hostesses: newSelected });
                }}
                onCloseHostess={() => dispatch({ type: 'SET_HOSTESS_TARGET', target: null })}
                onConfirmHostess={() => {
                    if (hostessSelectionTarget) {
                        const pid = hostessSelectionTarget.productId;
                        const hasComm = Number(hostessSelectionTarget.product.comision || hostessSelectionTarget.product.commission || 0) > 0;
                        const currentSelected = modalHostessSelections[pid] || [];
                        if (hasComm && currentSelected.length === 0) {
                            showToast('Asignación', 'Debes escoger al menos 1 anfitriona', 'error');
                            return;
                        }
                        addProductToCart(hostessSelectionTarget.product);
                        dispatch({ type: 'SET_HOSTESS_TARGET', target: null });
                        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false });
                    }
                }}

                modalOpen={modalOpen}
                modalCategoria={modalCategoria}
                modalLoading={modalLoading}
                modalProducts={modalProducts}
                modalQuantities={modalQuantities}
                onCloseCategory={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false })}
                onSetQuantity={(productId, qty) => dispatch({ type: 'SET_MODAL_QUANTITY', productId, quantity: qty })}
                onSetHostessTarget={(target) => dispatch({ type: 'SET_HOSTESS_TARGET', target })}
                addProductToCart={addProductToCart}
                isChampagneProduct={isChampagneProduct}

                timeModalVisible={state.timeModalVisible}
                selectedTime={state.selectedTime}
                onCloseTime={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: false })}
                onSelectTime={(time) => dispatch({ type: 'SET_SELECTED_TIME', payload: time })}

                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        gap: 4
    },
    backTextRight: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    scrollContent: { padding: 16, paddingBottom: 100 },
    browserContainer: { marginBottom: 20 },
    sectionSkeleton: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    summaryCardSkeleton: { padding: 24, borderRadius: 32, borderWidth: 1 }
});
