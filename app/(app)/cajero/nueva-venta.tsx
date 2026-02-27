import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { ClientSelectModal } from '../../../components/cajero/forms/ClientSelectModal';
import { HostessSelectModal } from '../../../components/cajero/forms/HostessSelectModal';
import { PaymentMethod, PaymentMethodSelect } from '../../../components/cajero/forms/PaymentMethodSelect';
import { RoomSelectModal } from '../../../components/cajero/forms/RoomSelectModal';
import { useAuthStore } from '../../../store/authStore';

export default function NuevaVentaScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);

    // Initial Data
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [anfitrionas, setAnfitrionas] = useState<any[]>([]);
    const [habitaciones, setHabitaciones] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);

    // Form State
    const [cart, setCart] = useState<any[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [selectedHabitacion, setSelectedHabitacion] = useState<any>(null);
    const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');
    const [enableTip, setEnableTip] = useState(false);

    // config & totals state
    const [selectedTime, setSelectedTime] = useState(60);
    const [timeModalVisible, setTimeModalVisible] = useState(false);

    // Categories and Browser
    const [categories, setCategories] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalCategoria, setModalCategoria] = useState<any>(null);
    const [modalProducts, setModalProducts] = useState<any[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    // States for selections within the modal
    const [modalQuantities, setModalQuantities] = useState<{ [key: number]: number }>({});
    const [modalHostessSelections, setModalHostessSelections] = useState<{ [key: number]: number[] }>({});

    // For Hostess selection sub-modal
    const [hostessSelectionTarget, setHostessSelectionTarget] = useState<{ productId: number; isChampagne: boolean; max: number } | null>(null);
    const [hostessSubModalVisible, setHostessSubModalVisible] = useState(false);
    const [hostessModalVisible, setHostessModalVisible] = useState(false);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [activeCartIdx, setActiveCartIdx] = useState<number | null>(null);

    // Toast
    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000,
        });
    };

    const [submitting, setSubmitting] = useState(false);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    // Load Initial Data
    const fetchInitialData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoadingInitial(true);
        try {
            const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] = await Promise.all([
                apiClient('/cashregister/status'),
                apiClient('/users?anfitrionas=1'),
                apiClient('/rooms'),
                apiClient('/clients'),
                apiClient('/categories'),
            ]);

            setCajaAbierta(cajaRes.success && cajaRes.data.hasOpenCaja);
            if (anfitrionasRes.success) setAnfitrionas(anfitrionasRes.data);
            if (roomsRes.success) setHabitaciones(roomsRes.data);
            if (Array.isArray(clientsRes)) {
                setClientes(clientsRes);
            } else if (clientsRes && clientsRes.success) {
                setClientes(clientsRes.data || []);
            }

            if (categoriesRes.success) {
                setCategories(categoriesRes.data || []);
            }

            if (!cajaRes.success || !cajaRes.data.hasOpenCaja) {
                showToast('Caja Cerrada', 'Debes abrir una caja antes de realizar ventas.', 'error');
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
            showToast('Error', 'No se pudo cargar la información necesaria.');
        } finally {
            setLoadingInitial(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInitialData(true);
    };

    const isChampagneProduct = (producto: any) => {
        const cat = (producto.categoria || '').toLowerCase();
        return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
    };

    const getChampagneLimit = (precio: number) => {
        if (precio >= 240000) return 5;
        if (precio >= 200000) return 4;
        if (precio >= 140000) return 3;
        if (precio >= 120000) return 2;
        return 1;
    };

    const getHostessLimit = (prod: any, qty: number) => {
        const price = prod.precio ?? prod.price ?? 0;
        if (isChampagneProduct(prod)) {
            return getChampagneLimit(price);
        }
        return qty;
    };

    const handleOpenCategory = async (cat: any) => {
        setModalCategoria(cat);
        setModalOpen(true);
        setModalLoading(true);
        setModalQuantities({});
        setModalHostessSelections({});
        try {
            const res = await apiClient(`/products?category_id=${cat.id}`);
            if (res.success) {
                setModalProducts(res.data || []);
            } else {
                setModalProducts([]);
            }
        } catch (error) {
            console.error('Fetch products error:', error);
            setModalProducts([]);
        } finally {
            setModalLoading(false);
        }
    };

    const updateModalQty = (id: number, delta: number) => {
        setModalQuantities((prev) => {
            const curr = prev[id] || 1;
            const next = Math.max(1, curr + delta);
            return { ...prev, [id]: next };
        });
    };

    const toggleHostessInModal = (hostessId: number) => {
        if (!hostessSelectionTarget) return;
        const { productId, max } = hostessSelectionTarget;

        setModalHostessSelections((prev) => {
            const current = prev[productId] || [];
            if (current.includes(hostessId)) {
                return { ...prev, [productId]: current.filter((id) => id !== hostessId) };
            } else {
                if (current.length < max) {
                    return { ...prev, [productId]: [...current, hostessId] };
                } else {
                    showToast('Límite', `Máximo ${max} anfitrionas`);
                    return prev;
                }
            }
        });
    };

    const addProductToCart = (prod: any) => {
        const id = prod.id || prod.id_producto;
        const qty = modalQuantities[id] || 1;
        const selectedHostesses = modalHostessSelections[id] || [];
        const hasComm = (prod.comision || prod.commission || 0) > 0;

        if (hasComm && selectedHostesses.length === 0) {
            showToast('Asignación', 'Debes asignar al menos una anfitriona');
            return;
        }

        const price = prod.precio ?? prod.price ?? 0;
        const comm = prod.comision ?? prod.commission ?? 0;

        const item = {
            id_producto: id,
            nombre: prod.nombre || prod.name || 'Producto',
            precio: price,
            comision: comm,
            cantidad: qty,
            subtotal: price * qty,
            selectedHostesses: selectedHostesses,
            isChampagne: isChampagneProduct(prod),
        };

        setCart((prev) => [...prev, item]);

        // Reset selections for this product in modal
        setModalQuantities((prev) => ({ ...prev, [id]: 1 }));
        setModalHostessSelections((prev) => ({ ...prev, [id]: [] }));

        showToast('Agregado', `${item.nombre} sumado al carrito`, 'success');

        // If it was the only product in search-like view, close modal
        if (modalProducts.length === 1) {
            setModalOpen(false);
        }
    };

    const removeFromCart = (index: number) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart((prev) =>
            prev.map((item, i) => {
                if (i === index) {
                    const newQty = Math.max(1, item.cantidad + delta);
                    return { ...item, cantidad: newQty };
                }
                return item;
            })
        );
    };

    const toggleHostess = (hostessId: number) => {
        if (activeCartIdx === null) return;

        setCart((prev) =>
            prev.map((item, i) => {
                if (i === activeCartIdx) {
                    const exists = item.selectedHostesses.includes(hostessId);
                    let newSelections = [];

                    if (exists) {
                        newSelections = item.selectedHostesses.filter((id: number) => id !== hostessId);
                    } else {
                        const max = getHostessLimit(item, item.cantidad);
                        if (item.selectedHostesses.length < max) {
                            newSelections = [...item.selectedHostesses, hostessId];
                        } else {
                            showToast('Límite', `Máximo ${max} anfitrionas`);
                            return item;
                        }
                    }
                    return { ...item, selectedHostesses: newSelections };
                }
                return item;
            })
        );
    };

    const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const propina = enableTip ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal + propina;

    const showPrivateSelectors = cart.some((item) => item.precio >= 30000);

    const handleSubmit = async () => {
        if (!cajaAbierta) {
            showToast('Error', 'La caja está cerrada.');
            return;
        }
        if (cart.length === 0) {
            showToast('Error', 'El carrito está vacío.');
            return;
        }

        // Validate commissions
        for (const item of cart) {
            if (item.comision > 0 && item.selectedHostesses.length === 0) {
                showToast('Faltan datos', `Asigna al menos una anfitriona a ${item.nombre}`, 'error');
                return;
            }
        }

        setSubmitting(true);
        try {
            // Aggregate all unique hostess IDs
            const allHostesses = Array.from(new Set(cart.flatMap((item) => item.selectedHostesses)));
            const totalComision = cart.reduce((acc, item) => acc + item.comision * item.cantidad, 0);

            const ventaData = {
                cliente_id: selectedCliente?.id || selectedCliente?.id_cliente || null,
                habitacion_id: selectedHabitacion?.id_habitacion || null,
                metodo_pago: metodoPago,
                propina: propina,
                sub_total: subtotal,
                total: total,
                total_comision: totalComision,
                detalles: cart.map((item) => ({
                    producto_id: item.id_producto,
                    precio: item.precio,
                    comision: item.comision * item.cantidad,
                    cantidad: item.cantidad,
                    sub_total: item.precio * item.cantidad,
                    hostesses: item.selectedHostesses,
                    hostess_id: item.selectedHostesses.length > 0 ? item.selectedHostesses[0] : null,
                })),
                usuarios: allHostesses,
                tiempo: selectedHabitacion ? selectedTime : null,
            };

            const res = await apiClient('/sales', {
                method: 'POST',
                body: JSON.stringify(ventaData),
            });

            if (res.success) {
                // If tip > 0, register it
                if (propina > 0 && res.data?.id_venta) {
                    await apiClient('/tips', {
                        method: 'POST',
                        body: JSON.stringify({ venta_id: res.data.id_venta, monto: propina }),
                    }).catch((e) => console.error('Tip reg error:', e));
                }

                showToast('Éxito', 'Venta realizada correctamente', 'success');
                setTimeout(() => router.replace('/cajero/ventas'), 1500);
            } else {
                showToast('Error', res.message || 'No se pudo crear la venta');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast('Error', 'Ocurrió un error al procesar la venta.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingInitial) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bg }]}
        > 
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
            >
                {/* 1. Selection Section */}
                <View style={[styles.browserContainer]}>
                    <Text style={[styles.browserTitle, { color: textPrimary }]}>1. Selección de Categoría</Text>

                    {/* Category Horizonatal Slide */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {categories.map((cat, idx) => {
                            let iconName = 'beer-outline';

                            return (
                                <Pressable
                                    key={cat.id}
                                    style={[styles.categorySmallCard, { backgroundColor: cardBg, borderColor }]}
                                    onPress={() => handleOpenCategory(cat)}
                                >
                                    <View style={[styles.catIconBox, { backgroundColor: idx % 2 === 0 ? '#8B5CF615' : '#10B98115' }]}>
                                        <Ionicons name={iconName as any} size={20} color={idx % 2 === 0 ? '#8B5CF6' : '#10B981'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.catSmallName, { color: textPrimary }]} numberOfLines={2}>{cat.name}</Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 2. Cart Section */}
                {cart.length > 0 && (
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Carrito de Consumo</Text>
                        {cart.map((item, idx) => (
                            <View key={idx} style={[styles.cartItem, { borderBottomColor: borderColor }]}>
                                <View style={styles.cartItemInfo}>
                                    <Text style={[styles.cartItemName, { color: textPrimary }]}>{item.nombre}</Text>
                                    <Text style={[styles.cartItemPrice, { color: textSecondary }]}>${(item.precio ?? 0).toLocaleString()} c/u</Text>
                                    {item.comision > 0 && (
                                        <Pressable
                                            style={[styles.hostessSelector, { backgroundColor: item.selectedHostesses.length > 0 ? '#8B5CF620' : '#EF444410' }]}
                                            onPress={() => {
                                                setActiveCartIdx(idx);
                                                setHostessModalVisible(true);
                                            }}
                                        >
                                            <Ionicons name="people" size={14} color={item.selectedHostesses.length > 0 ? '#8B5CF6' : '#EF4444'} />
                                            <Text style={[styles.hostessSelectorText, { color: item.selectedHostesses.length > 0 ? '#8B5CF6' : '#EF4444' }]}>
                                                {item.selectedHostesses.length > 0
                                                    ? `${item.selectedHostesses.length} asignada(s)`
                                                    : 'Asignar Anfitriona'}
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>

                                <View style={styles.cartActions}>
                                    <View style={styles.qtyBox}>
                                        <Pressable onPress={() => updateQuantity(idx, -1)} style={styles.qtyBtn}>
                                            <Ionicons name="remove" size={18} color={textPrimary} />
                                        </Pressable>
                                        <Text style={[styles.qtyText, { color: textPrimary }]}>{item.cantidad}</Text>
                                        <Pressable onPress={() => updateQuantity(idx, 1)} style={styles.qtyBtn}>
                                            <Ionicons name="add" size={18} color={textPrimary} />
                                        </Pressable>
                                    </View>
                                    <Pressable onPress={() => removeFromCart(idx)} style={styles.removeBtn}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. config & totals */}
                <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>2. Configuración de Venta</Text>

                    {showPrivateSelectors && (
                        <>
                            {/* Habitación */}
                            <Pressable
                                style={[styles.selectorBtn, { borderColor }]}
                                onPress={() => setRoomModalVisible(true)}
                            >
                                <Ionicons name="business-outline" size={22} color="#8B5CF6" />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.selectorLabel, { color: textSecondary }]}>Habitación (Opcional)</Text>
                                    <Text style={[styles.selectorVal, { color: textPrimary }]}>{selectedHabitacion?.nombre || 'Ninguna seleccionada'}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                            </Pressable>

                            {/* Tiempo */}
                            <Pressable
                                style={[styles.selectorBtn, { borderColor, marginTop: 12 }]}
                                onPress={() => setTimeModalVisible(true)}
                            >
                                <Ionicons name="time-outline" size={22} color="#10B981" />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.selectorLabel, { color: textSecondary }]}>Tiempo de Estancia</Text>
                                    <Text style={[styles.selectorVal, { color: textPrimary }]}>{selectedTime} minutos</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                            </Pressable>
                        </>
                    )}

                    {/* Cliente */}
                    <Pressable
                        style={[styles.selectorBtn, { borderColor, marginTop: showPrivateSelectors ? 12 : 0 }]}
                        onPress={() => setClientModalVisible(true)}
                    >
                        <Ionicons name="person-outline" size={22} color="#3B82F6" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary }]}>Cliente (Opcional)</Text>
                            <Text style={[styles.selectorVal, { color: textPrimary }]}>
                                {selectedCliente
                                    ? `${selectedCliente.nombre || selectedCliente.name || ''} ${selectedCliente.apellido || selectedCliente.last_name || ''}`.trim() || 'Cliente seleccionado'
                                    : 'Sin registrar'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>

                    {/* Método Pago */}
                    <PaymentMethodSelect
                        selectedMethod={metodoPago}
                        onSelect={setMetodoPago}
                    />

                    {/* Tip Toggle */}
                    <Pressable
                        style={[styles.tipToggle, { borderColor, backgroundColor: enableTip ? '#10B98110' : 'transparent' }]}
                        onPress={() => setEnableTip(!enableTip)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.tipTitle, { color: textPrimary }]}>Incluir Propina (10%)</Text>
                        </View>
                        <View style={[styles.checkbox, { backgroundColor: enableTip ? '#10B981' : 'transparent', borderColor: enableTip ? '#10B981' : borderColor }]}>
                            {enableTip && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                    </Pressable>
                </View>

                {/* Summary */}
                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderTopColor: borderColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text>
                        <Text style={[styles.summaryVal, { color: textPrimary }]}>${subtotal.toLocaleString()}</Text>
                    </View>
                    {enableTip && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Propina (10%)</Text>
                            <Text style={[styles.summaryVal, { color: '#10B981' }]}>+${propina.toLocaleString()}</Text>
                        </View>
                    )}
                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}>
                        <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL A PAGAR</Text>
                        <Text style={styles.totalValFinal}>${total.toLocaleString()}</Text>
                    </View>

                    <Pressable
                        style={[styles.submitBtn, { backgroundColor: '#8B5CF6' }, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Generar Venta</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </ScrollView>

            {/* Product Selection Modal */}
            <Modal visible={modalOpen} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.modalContentWide, { backgroundColor: cardBg, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                    {modalCategoria?.name || 'Productos'}
                                </Text>
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Selecciona y configura antes de añadir</Text>
                            </View>
                            <Pressable onPress={() => setModalOpen(false)} style={styles.closeModalBtn}>
                                <Ionicons name="close" size={26} color={textPrimary} />
                            </Pressable>
                        </View>

                        {modalLoading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator color="#8B5CF6" size="large" />
                            </View>
                        ) : (
                            <FlatList
                                data={modalProducts}
                                keyExtractor={(item, index) => (item.id || item.id_producto || index).toString()}
                                contentContainerStyle={{ padding: 16 }}
                                ListEmptyComponent={
                                    <Text style={{ textAlign: 'center', color: textSecondary, marginTop: 40 }}>No hay productos disponibles</Text>
                                }
                                renderItem={({ item }) => {
                                    const id = item.id || item.id_producto;
                                    const qty = modalQuantities[id] || 1;
                                    const selected = modalHostessSelections[id] || [];
                                    const hasComm = (item.comision || item.commission || 0) > 0;
                                    const isChamp = isChampagneProduct(item);

                                    return (
                                        <View style={[styles.modalProductRow, { borderBottomColor: borderColor }]}>
                                            <View style={styles.modalProductTop}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.modalProductName, { color: textPrimary }]}>{item.nombre || item.name}</Text>
                                                    <View style={{ marginTop: 4 }}>
                                                        <Text style={[styles.modalProductPrice, { color: '#10B981' }]}>
                                                            ${(item.precio ?? item.price ?? 0).toLocaleString()}
                                                        </Text>
                                                        {hasComm && (
                                                            <View style={[styles.commBadge, { alignSelf: 'flex-start', marginTop: 4 }]}>
                                                                <Text style={styles.commBadgeText}>COMISIÓN: ${(item.comision || item.commission || 0).toLocaleString()}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>

                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <View style={[styles.modalQtyControl, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                                        <Pressable
                                                            onPress={() => updateModalQty(id, -1)}
                                                            style={[styles.modalQtyBtn, { backgroundColor: isDark ? '#4B5563' : '#FFFFFF' }]}
                                                        >
                                                            <Ionicons name="remove" size={18} color={textPrimary} />
                                                        </Pressable>
                                                        <Text style={[styles.modalQtyText, { color: textPrimary }]}>{qty}</Text>
                                                        <Pressable
                                                            onPress={() => updateModalQty(id, 1)}
                                                            style={[styles.modalQtyBtn, { backgroundColor: isDark ? '#4B5563' : '#FFFFFF' }]}
                                                        >
                                                            <Ionicons name="add" size={18} color={textPrimary} />
                                                        </Pressable>
                                                    </View>

                                                    <Pressable
                                                        style={[styles.modalAddBtn, { backgroundColor: '#8B5CF6' }]}
                                                        onPress={() => addProductToCart(item)}
                                                    >
                                                        <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                                                    </Pressable>
                                                </View>
                                            </View>

                                            {hasComm && (
                                                <View style={styles.modalProductBottom}>
                                                    <Pressable
                                                        style={[
                                                            styles.modalHostessSelector,
                                                            {
                                                                borderColor: selected.length > 0 ? '#8B5CF6' : borderColor,
                                                                backgroundColor: selected.length > 0 ? '#8B5CF610' : 'transparent',
                                                                flex: 1,
                                                            },
                                                        ]}
                                                        onPress={() => {
                                                            setHostessSelectionTarget({
                                                                productId: id,
                                                                isChampagne: isChamp,
                                                                max: getHostessLimit(item, qty),
                                                            });
                                                            setHostessSubModalVisible(true);
                                                        }}
                                                    >
                                                        <Ionicons name="people-outline" size={18} color={selected.length > 0 ? '#8B5CF6' : textSecondary} />
                                                        <Text style={[styles.modalHostessText, { color: selected.length > 0 ? '#8B5CF6' : textSecondary }]}>
                                                            {selected.length > 0 ? `${selected.length} seleccionada(s)` : `Asignar anfitriona`}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        )}
                        <Pressable style={[styles.modalBottomClose, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} onPress={() => setModalOpen(false)}>
                            <Text style={[styles.modalBottomCloseText, { color: textPrimary }]}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Sub-modals using reusable components */}
            <HostessSelectModal
                visible={hostessSubModalVisible}
                hostesses={anfitrionas}
                selectedIds={modalHostessSelections[hostessSelectionTarget?.productId || 0] || []}
                max={hostessSelectionTarget?.max}
                onClose={() => setHostessSubModalVisible(false)}
                onToggle={toggleHostessInModal}
                title="Asignar Anfitrionas"
            />

            <HostessSelectModal
                visible={hostessModalVisible}
                hostesses={anfitrionas}
                selectedIds={activeCartIdx !== null ? cart[activeCartIdx].selectedHostesses : []}
                max={activeCartIdx !== null ? getHostessLimit(cart[activeCartIdx], cart[activeCartIdx].cantidad) : undefined}
                onClose={() => setHostessModalVisible(false)}
                onToggle={toggleHostess}
                title="Modificar Anfitrionas"
            />

            <RoomSelectModal
                visible={roomModalVisible}
                rooms={habitaciones}
                selectedRoomId={selectedHabitacion?.id_habitacion || selectedHabitacion?.id}
                onClose={() => setRoomModalVisible(false)}
                onSelect={(room) => {
                    setSelectedHabitacion(room);
                    setRoomModalVisible(false);
                }}
            />

            <Modal visible={timeModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Tiempo de Estancia</Text>
                            <Pressable onPress={() => setTimeModalVisible(false)}><Ionicons name="close" size={24} color={textPrimary} /></Pressable>
                        </View>
                        <FlatList
                            data={[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]}
                            keyExtractor={item => item.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.listItem, { borderBottomColor: borderColor }]}
                                    onPress={() => { setSelectedTime(item); setTimeModalVisible(false); }}
                                >
                                    <Ionicons name="time" size={22} color="#10B981" />
                                    <Text style={[styles.listItemTitle, { color: textPrimary, marginLeft: 16 }]}>{item} minutos</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <ClientSelectModal
                visible={clientModalVisible}
                clients={clientes}
                selectedIds={selectedCliente ? [selectedCliente.id_cliente || selectedCliente.id] : []}
                max={1}
                onClose={() => setClientModalVisible(false)}
                onToggle={(id) => {
                    const client = clientes.find(c => (c.id_cliente || c.id) === id);
                    setSelectedCliente(client);
                    setClientModalVisible(false);
                }}
            />

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        marginBottom: 8,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 },
    browserContainer: { marginBottom: 20 },
    browserTitle: { fontSize: 13, fontWeight: '900', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 4 },
    categoryScroll: {
        paddingHorizontal: 4,
        gap: 12,
    },
    categorySmallCard: {
        width: 140,
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 64,
    },
    catIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    catSmallName: { fontSize: 12, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '80%' },
    modalContentWide: { width: '95%', alignSelf: 'center', borderRadius: 32, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    modalSubtitle: { fontSize: 13, fontWeight: '600' },
    closeModalBtn: { padding: 4 },
    modalProductRow: { paddingVertical: 16, borderBottomWidth: 1 },
    modalProductTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalProductName: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 10 },
    modalProductPrice: { fontSize: 15, fontWeight: '800' },
    commBadge: { backgroundColor: '#8B5CF615', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    commBadgeText: { fontSize: 9, fontWeight: '900', color: '#8B5CF6' },
    modalQtyControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 4,
    },
    modalQtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modalQtyText: { marginHorizontal: 16, fontSize: 16, fontWeight: '900' },
    modalProductBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
    modalHostessSelector: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 },
    modalHostessText: { fontSize: 12, fontWeight: '700', flex: 1 },
    modalAddBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalBottomClose: { height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    modalBottomCloseText: { fontSize: 14, fontWeight: '800' },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
    listItemTitle: { fontSize: 16, fontWeight: '800' },
    modalActionBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    modalActionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    cartItem: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1 },
    cartItemInfo: { flex: 1 },
    cartItemName: { fontSize: 15, fontWeight: '800' },
    cartItemPrice: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    hostessSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginTop: 8, alignSelf: 'flex-start' },
    hostessSelectorText: { fontSize: 12, fontWeight: '800' },
    cartActions: { alignItems: 'flex-end', justifyContent: 'space-between' },
    qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4 },
    qtyBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    qtyText: { marginHorizontal: 10, fontSize: 14, fontWeight: '900' },
    removeBtn: { marginTop: 10 },
    selectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
    selectorLabel: { fontSize: 12, fontWeight: '700' },
    selectorVal: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    inputGroupLabel: { fontSize: 11, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
    tipToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dotted' },
    tipTitle: { fontSize: 14, fontWeight: '800' },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    summaryCard: { marginTop: 20, padding: 24, borderRadius: 32, borderWidth: 1, elevation: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabelFinal: { fontSize: 16, fontWeight: '900' },
    totalValFinal: { fontSize: 28, fontWeight: '900', color: '#8B5CF6' },
    submitBtn: { height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
});
