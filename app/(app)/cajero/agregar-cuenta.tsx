import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { CartList } from "@/components/cajero/forms/CartList";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { useAccentColor } from '@/hooks/useAccentColor';
import { useTimer } from '@/context/TimerContext';
import logger from '@/utils/logger';

import {
    InfoBanner,
    CategorySelector,
    RoomSelectionSection,
    NewConsumptionsSummary,
    AgregarCuentaModales
} from '@/components/cajero/agregar-cuenta';
import type { CuentaDetalle } from '@/hooks/types/cuentaTypes';

type CuentaState = {
    loadingInitial: boolean;
    refreshing: boolean;
    anfitrionas: any[];
    habitaciones: any[];
    categories: any[];
    cart: any[];
    selectedHabitacion: any;
    selectedTime: number;
    roomModalVisible: boolean;
    modalOpen: boolean;
    modalCategoria: any;
    modalProducts: any[];
    modalLoading: boolean;
    modalQuantities: { [key: number]: number };
    modalHostessSelections: { [key: number]: (string | number)[] };
    hostessSelectionTarget: { productId: number; isChampagne: boolean; max: number; product?: any } | null;
    hostessSubModalVisible: boolean;
    submitting: boolean;
    extraTiempo: number;
    timeModalVisible: boolean;
    cuentaDetalle: CuentaDetalle | null;
};

type CuentaAction =
    | { type: 'SET_LOADING_INITIAL'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_INITIAL_DATA'; payload: any }
    | { type: 'SET_CART'; payload: any[] }
    | { type: 'SET_MODAL_VISIBLE'; modal: string; visible: boolean }
    | { type: 'OPEN_CATEGORY_MODAL'; category: any; products: any[] }
    | { type: 'SET_MODAL_LOADING'; payload: boolean }
    | { type: 'SET_MODAL_QUANTITY'; productId: number; quantity: number }
    | { type: 'SET_MODAL_HOSTESSES'; productId: number; hostesses: (string | number)[] }
    | { type: 'SET_HOSTESS_TARGET'; target: any }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | { type: 'SET_SELECTED_HABITACION'; payload: any }
    | { type: 'SET_SELECTED_TIME'; payload: number }
    | { type: 'SET_ROOM_MODAL_VISIBLE'; payload: boolean }
    | { type: 'SET_EXTRA_TIEMPO'; payload: number }
    | { type: 'SET_TIME_MODAL_VISIBLE'; payload: boolean };

const initialCuentaState: CuentaState = {
    loadingInitial: true,
    refreshing: false,
    anfitrionas: [],
    habitaciones: [],
    categories: [],
    cart: [],
    selectedHabitacion: null,
    selectedTime: 5,
    roomModalVisible: false,
    modalOpen: false,
    modalCategoria: null,
    modalProducts: [],
    modalLoading: false,
    modalQuantities: {},
    modalHostessSelections: {},
    hostessSelectionTarget: null,
    hostessSubModalVisible: false,
    submitting: false,
    extraTiempo: 0,
    timeModalVisible: false,
    cuentaDetalle: null,
};

function cuentaReducer(state: CuentaState, action: CuentaAction): CuentaState {
    switch (action.type) {
        case 'SET_LOADING_INITIAL': return { ...state, loadingInitial: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_INITIAL_DATA': return { ...state, ...action.payload };
        case 'SET_CART': return { ...state, cart: action.payload };
        case 'SET_MODAL_VISIBLE':
            return { ...state, modalOpen: action.visible };
        case 'OPEN_CATEGORY_MODAL':
            return { ...state, modalOpen: true, modalCategoria: action.category, modalProducts: action.products, modalQuantities: {}, modalHostessSelections: {} };
        case 'SET_MODAL_LOADING': return { ...state, modalLoading: action.payload };
        case 'SET_MODAL_QUANTITY':
            return { ...state, modalQuantities: { ...state.modalQuantities, [action.productId]: action.quantity } };
        case 'SET_MODAL_HOSTESSES':
            return { ...state, modalHostessSelections: { ...state.modalHostessSelections, [action.productId]: action.hostesses } };
        case 'SET_HOSTESS_TARGET':
            return { ...state, hostessSelectionTarget: action.target, hostessSubModalVisible: !!action.target };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        case 'SET_SELECTED_HABITACION': return { ...state, selectedHabitacion: action.payload };
        case 'SET_SELECTED_TIME': return { ...state, selectedTime: action.payload };
        case 'SET_ROOM_MODAL_VISIBLE': return { ...state, roomModalVisible: action.payload };
        case 'SET_EXTRA_TIEMPO': return { ...state, extraTiempo: action.payload };
        case 'SET_TIME_MODAL_VISIBLE': return { ...state, timeModalVisible: action.payload };
        default: return state;
    }
}

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

const getHostessLimit = (prod: any, qty: number) => {
    const price = prod.precio ?? prod.price ?? 0;
    if (isChampagneProduct(prod)) {
        return getChampagneLimit(price) * qty;
    }
    return qty;
};

export default function AgregarCuentaScreen() {
    const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const router = useRouter();
    const params = useLocalSearchParams();

    const cuentaOriginal = useMemo(() => {
        if (params.cuenta && typeof params.cuenta === 'string') {
            try {
                return JSON.parse(params.cuenta);
            } catch {
                return null;
            }
        }
        return null;
    }, [params.cuenta]);

    const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);
    const {
        loadingInitial, refreshing, anfitrionas, habitaciones, categories, modalOpen, modalCategoria,
        modalProducts, modalLoading, modalQuantities, modalHostessSelections, hostessSelectionTarget,
        hostessSubModalVisible, cart, submitting, extraTiempo, timeModalVisible, cuentaDetalle,
        selectedHabitacion, selectedTime, roomModalVisible
    } = state;

    const hasRoom = !!(cuentaOriginal?.habitacion_id);
    const accountHostessIds: number[] = (cuentaDetalle?.usuarios || []).map((u) => (u.usuario_id ?? u.id_usuario) as number).filter(Boolean);

    const showRoomSelector = cart.some(item =>
        item.selectedHostesses && item.selectedHostesses.length > 0
    );

    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const { timers, refreshTimers } = useTimer();



    const spacing = isTablet ? 24 : 16;

    const dynamicStyles = {
        scrollContent: { padding: spacing, paddingBottom: 100 },
    };

    const fetchInitialData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
        try {
            const requests: Promise<any>[] = [
                apiClient('/anfitrionas'),
                apiClient('/categories'),
                apiClient('/rooms'),
            ];
            if (cuentaOriginal?.id_cuenta) {
                requests.push(apiClient(`/cuentas/${cuentaOriginal.id_cuenta}`));
            }
            const [anfitrionasRes, categoriesRes, roomsRes, cuentaDetalleRes] = await Promise.all(requests);

            const rawHabitaciones = roomsRes?.success ? roomsRes.data : [];
            dispatch({
                type: 'SET_INITIAL_DATA', payload: {
                    anfitrionas: Array.isArray(anfitrionasRes) ? anfitrionasRes : (anfitrionasRes.success ? anfitrionasRes.data : []),
                    categories: categoriesRes.success ? (categoriesRes.data || []) : [],
                    habitaciones: rawHabitaciones.map((room: any) => ({
                        ...room,
                        nombre: room.nombre ?? room.name ?? `Habitación ${room.id_habitacion ?? room.id ?? ''}`.trim(),
                        precio: room.precio ?? room.price ?? 0,
                        tiempo: room.tiempo ?? room.time ?? 0,
                        estado: room.estado ?? room.status ?? 0,
                    })),
                    cuentaDetalle: cuentaDetalleRes || null,
                }
            });
        } catch (error) {
            logger.captureException(error, { context: 'AgregarCuenta:addCuenta' });
            showToast('Error', 'No se pudo cargar la información necesaria.');
        } finally {
            dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, [cuentaOriginal]);

    useEffect(() => {
        fetchInitialData();
        if (!cuentaOriginal) {
            showToast('Error', 'No se recibió la información de la cuenta');
            router.back();
        }
    }, [fetchInitialData, cuentaOriginal, router]);

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
            logger.captureException(error, { context: 'AgregarCuenta:handleOpenCategory' });
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
        return { subtotal, total: subtotal + (cuentaOriginal?.total || 0) };
    }, [cart, cuentaOriginal]);

    const commissionPreview = useMemo(
        () => buildCommissionPreview(cart, anfitrionas),
        [cart, anfitrionas]
    );

    const handleSubmit = useCallback(async () => {
        if (cart.length === 0) {
            showToast('Error', 'No has agregado nuevos productos.');
            return;
        }
        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            const originalUserIds = (cuentaDetalle?.usuarios || [])
                .map((u) => u.usuario_id || u.id_usuario)
                .filter(Boolean) as number[];
            const mergedHostessIds = new Set<number>(originalUserIds);
            cart.forEach(item => {
                if (item.selectedHostesses && Array.isArray(item.selectedHostesses)) {
                    item.selectedHostesses.forEach((hId: number) => {
                        if (hId) mergedHostessIds.add(hId);
                    });
                }
            });
            const hasExistingTimer = timers.some(
                timer =>
                    timer.tipoTransaccion === 'cuenta' &&
                    String(timer.servicioId) === String(cuentaOriginal.id_cuenta)
            );
            const currentRoomId =
                cuentaDetalle?.habitacion_id ||
                cuentaOriginal?.habitacion_id ||
                null;
            const roomIdToUse =
                selectedHabitacion?.id_habitacion ||
                selectedHabitacion?.id ||
                null;
            const timeToUse = selectedHabitacion ? selectedTime : 0;
            const isSameRoomSelection =
                Boolean(roomIdToUse) &&
                Boolean(currentRoomId) &&
                String(roomIdToUse) === String(currentRoomId);
            const cuentaData: any = {
                detalles: cart.map((item) => ({
                    producto_id: item.id_producto || item.id,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    sub_total: item.precio * item.cantidad,
                    comision: item.comision * (item.cantidad || 1),
                    hostesses: item.selectedHostesses || [],
                    isChampagne: item.isChampagne
                })),
                usuarios: Array.from(mergedHostessIds)
            };
            if (extraTiempo > 0 && hasRoom) {
                cuentaData.extraTiempo = extraTiempo;
            }
            if (isSameRoomSelection && timeToUse > 0) {
                cuentaData.extraTiempo = Number(cuentaData.extraTiempo || 0) + timeToUse;
            } else if (!hasExistingTimer && roomIdToUse && timeToUse > 0) {
                cuentaData.habitacion_id = roomIdToUse;
                cuentaData.tiempo = timeToUse;
            } else if (selectedHabitacion) {
                cuentaData.habitacion_id = selectedHabitacion.id_habitacion || selectedHabitacion.id;
                cuentaData.tiempo = selectedTime;
            }
            refreshTimers?.();
            const res = await apiClient(`/cuentas/${cuentaOriginal.id_cuenta}`, {
                method: 'PUT',
                body: JSON.stringify(cuentaData),
            });
            if (res.success) {
                showToast('Éxito', 'Productos agregados correctamente', 'success');
                DeviceEventEmitter.emit('refresh_cuentas');
                setTimeout(() => router.back(), 1500);
            } else {
                showToast('Error', res.message || 'No se pudo actualizar la cuenta');
            }
        } catch (error) {
            logger.captureException(error, { context: 'AgregarCuenta:addCuenta' });
            showToast('Error', 'Ocurrió un error al procesar la cuenta.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [cart, cuentaOriginal, router, extraTiempo, hasRoom, cuentaDetalle, selectedHabitacion, selectedTime, timers, refreshTimers]);

    if (loadingInitial) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color={accentColor} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bg }]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader 
                title="Agregar Productos"
                subtitle={`Cuenta ${cuentaOriginal?.codigo}`}
                rightComponent={
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backBtnRight}
                        accessibilityLabel="Volver"
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backTextRight}>ATRÁS</Text>
                    </Pressable>
                }
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <InfoBanner
                    cuentaCodigo={cuentaOriginal?.codigo || ''}
                    clienteNombre={cuentaOriginal?.cliente_nombre || 'Sin cliente'}
                    accentColor={accentColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                />

                {false && hasRoom && (
                    <Pressable
                        style={[styles.tiempoChip, { backgroundColor: extraTiempo > 0 ? '#3B82F610' : cardBg, borderColor: extraTiempo > 0 ? '#3B82F6' : borderColor }]}
                        onPress={() => dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: true })}
                    >
                        <Ionicons name="timer-outline" size={18} color={extraTiempo > 0 ? '#3B82F6' : textSecondary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.tiempoChipLabel, { color: textSecondary }]}>TIEMPO EXTRA HABITACIÓN</Text>
                            <Text style={[styles.tiempoChipValue, { color: extraTiempo > 0 ? '#3B82F6' : textPrimary }]}>
                                {extraTiempo > 0 ? `+ ${extraTiempo} minutos` : 'Sin tiempo extra'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={16} color={extraTiempo > 0 ? '#3B82F6' : textSecondary} />
                    </Pressable>
                )}

                <CategorySelector
                    categories={categories}
                    accentColor={accentColor}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    onOpenCategory={handleOpenCategory}
                />

                <RoomSelectionSection
                    showRoomSelector={showRoomSelector}
                    selectedHabitacion={selectedHabitacion}
                    selectedTime={selectedTime}
                    spacing={spacing}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    accentColor={accentColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onPressRoom={() => dispatch({ type: 'SET_ROOM_MODAL_VISIBLE', payload: true })}
                    onChangeTime={(t) => dispatch({ type: 'SET_SELECTED_TIME', payload: t })}
                />

                {cart.length > 0 ? (
                    <CartList
                        items={cart}
                        title="Nuevos Consumos"
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
                ) : (
                    <View style={[styles.emptyCartBox, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.emptyCartText, { color: textSecondary }]}>No se han agregado nuevos consumos</Text>
                    </View>
                )}

                <NewConsumptionsSummary
                    cart={cart}
                    cuentaOriginalTotal={cuentaOriginal?.total || 0}
                    subtotal={totals.subtotal}
                    total={totals.total}
                    totalCommission={commissionPreview.totalCommission}
                    hostessDistribution={commissionPreview.hostessDistribution}
                    submitting={submitting}
                    isDark={isDark}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onSubmit={handleSubmit}
                />
            </ScrollView>

            <AgregarCuentaModales
                modalOpen={modalOpen}
                modalCategoria={modalCategoria}
                modalProducts={modalProducts}
                modalLoading={modalLoading}
                modalQuantities={modalQuantities}
                modalHostessSelections={modalHostessSelections}
                accountHostessIds={accountHostessIds}
                onCloseCategoryModal={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false })}
                onSetQuantity={(productId, qty) => dispatch({ type: 'SET_MODAL_QUANTITY', productId, quantity: qty })}
                onSetHostessTarget={(target) => dispatch({ type: 'SET_HOSTESS_TARGET', target })}
                onSetModalHostesses={(productId, hostesses) => dispatch({ type: 'SET_MODAL_HOSTESSES', productId, hostesses })}
                onSelectProduct={addProductToCart}

                timeModalVisible={timeModalVisible}
                onCloseTimeModal={() => dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: false })}
                extraTiempo={extraTiempo}
                onSelectTimeOption={(t) => {
                    dispatch({ type: 'SET_EXTRA_TIEMPO', payload: t });
                    dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: false });
                }}

                hostessSubModalVisible={hostessSubModalVisible && hostessSelectionTarget !== null}
                hostessSelectionTarget={hostessSelectionTarget}
                uniqueHostesses={Array.from(
                    new Map(anfitrionas.map((a: any) => [String(a.id_usuario || a.id), a])).values()
                ).map((a: any) => ({
                    id: a.id_usuario || a.id,
                    id_usuario: a.id_usuario || a.id,
                    nick: a.nick,
                    status: a.status || 0
                }))}
                selectedHostessIds={hostessSelectionTarget ? (modalHostessSelections[hostessSelectionTarget.productId] || []) : []}
                onToggleHostess={(id) => {
                    if (!hostessSelectionTarget) return;
                    const pid = hostessSelectionTarget.productId;
                    const currentSelected = modalHostessSelections[pid] || [];
                    let newSelected;
                    const strId = String(id);
                    if (currentSelected.some(x => String(x) === strId)) {
                        newSelected = currentSelected.filter(x => String(x) !== strId);
                    } else {
                        if (hostessSelectionTarget.max && currentSelected.length >= hostessSelectionTarget.max) return;
                        newSelected = [...currentSelected, strId];
                    }
                    dispatch({ type: 'SET_MODAL_HOSTESSES', productId: pid, hostesses: newSelected });
                }}
                onCloseHostessModal={() => dispatch({ type: 'SET_HOSTESS_TARGET', target: null })}
                onConfirmHostess={() => {
                    if (hostessSelectionTarget) {
                        const pid = hostessSelectionTarget.productId;
                        const hasComm = Number(hostessSelectionTarget.product.comision || hostessSelectionTarget.product.commission || 0) > 0;
                        const currentSelected = modalHostessSelections[pid] || [];
                        if (hasComm && currentSelected.length === 0) return;
                        addProductToCart(hostessSelectionTarget.product);
                        dispatch({ type: 'SET_HOSTESS_TARGET', target: null });
                        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false });
                    }
                }}

                roomModalVisible={roomModalVisible}
                habitaciones={habitaciones}
                selectedHabitacion={selectedHabitacion}
                onCloseRoomModal={() => dispatch({ type: 'SET_ROOM_MODAL_VISIBLE', payload: false })}
                onSelectRoom={(room) => {
                    dispatch({ type: 'SET_SELECTED_HABITACION', payload: room });
                    dispatch({ type: 'SET_ROOM_MODAL_VISIBLE', payload: false });
                }}

                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                accentColor={accentColor}
                bg={bg}
                isDark={isDark}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    emptyCartBox: { padding: 20, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyCartText: { fontSize: 14, fontWeight: '600' },
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
    tiempoChip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 20 },
    tiempoChipLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    tiempoChipValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});
