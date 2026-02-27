import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';

interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface Producto {
    id_producto: number;
    nombre: string;
    precio: number;
    comision: number;
    categoria: string;
}

interface ProductoSeleccionado extends Producto {
    cantidad: number;
    subtotal: number;
}

export default function NuevaCuentaScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
    const [selectedProductos, setSelectedProductos] = useState<ProductoSeleccionado[]>([]);
    const [searchProducto, setSearchProducto] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';
    const primaryColor = '#10B981';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [clientesRes, productosRes] = await Promise.all([
                apiClient('/clients'),
                apiClient('/products'),
            ]);

            if (Array.isArray(clientesRes)) {
                setClientes(clientesRes);
            } else if (clientesRes.success) {
                setClientes(clientesRes.data || []);
            }

            if (productosRes.success) {
                setProductos(productosRes.data || []);
            }
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudieron cargar los datos',
            });
        } finally {
            setLoading(false);
        }
    };

    const generateCodigo = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const filteredProductos = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchProducto.toLowerCase())
    );

    const handleAddProducto = (producto: Producto) => {
        const existing = selectedProductos.find(p => p.id_producto === producto.id_producto);
        if (existing) {
            setSelectedProductos(prev =>
                prev.map(p =>
                    p.id_producto === producto.id_producto
                        ? { ...p, cantidad: p.cantidad + 1, subtotal: p.precio * (p.cantidad + 1) }
                        : p
                )
            );
        } else {
            setSelectedProductos(prev => [
                ...prev,
                { ...producto, cantidad: 1, subtotal: producto.precio },
            ]);
        }
        Toast.show({
            type: 'success',
            text1: 'Producto agregado',
            text2: producto.nombre,
        });
    };

    const handleRemoveProducto = (id: number) => {
        setSelectedProductos(prev => prev.filter(p => p.id_producto !== id));
    };

    const handleChangeCantidad = (id: number, cantidad: number) => {
        if (cantidad <= 0) {
            handleRemoveProducto(id);
            return;
        }
        setSelectedProductos(prev =>
            prev.map(p =>
                p.id_producto === id
                    ? { ...p, cantidad, subtotal: p.precio * cantidad }
                    : p
            )
        );
    };

    const calculateTotals = () => {
        const subtotal = selectedProductos.reduce((sum, p) => sum + p.subtotal, 0);
        const comision = selectedProductos.reduce(
            (sum, p) => sum + p.comision * p.cantidad,
            0
        );
        return { subtotal, comision, total: subtotal };
    };

    const handleSubmit = async () => {
        if (!selectedCliente) {
            Alert.alert('Error', 'Selecciona un cliente');
            return;
        }

        if (selectedProductos.length === 0) {
            Alert.alert('Error', 'Agrega al menos un producto');
            return;
        }

        setSubmitting(true);
        try {
            const { subtotal, comision, total } = calculateTotals();

            const payload = {
                codigo: generateCodigo(),
                cliente_id: selectedCliente,
                total_comision: comision,
                sub_total: subtotal,
                total: total,
                detalles: selectedProductos.map(p => ({
                    producto_id: p.id_producto,
                    precio: p.precio,
                    cantidad: p.cantidad,
                    sub_total: p.subtotal,
                    comision: p.comision,
                })),
            };

            const response = await apiClient('/cuentas', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Cuenta Creada',
                    text2: 'La cuenta ha sido creada exitosamente',
                });
                router.back();
            } else {
                Alert.alert('Error', response.message || 'No se pudo crear la cuenta');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Error al crear la cuenta');
        } finally {
            setSubmitting(false);
        }
    };

    const { subtotal, comision, total } = calculateTotals();

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: bg }}
        >
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={textPrimary} />
                </Pressable>
                <Text style={[styles.title, { color: textPrimary }]}>Nueva Cuenta</Text>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Selección de Cliente */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>CLIENTE *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {clientes.map(cliente => (
                        <Pressable
                            key={cliente.id_cliente}
                            onPress={() => setSelectedCliente(cliente.id_cliente)}
                            style={[
                                styles.clienteCard,
                                { backgroundColor: cardBg, borderColor },
                                selectedCliente === cliente.id_cliente && {
                                    borderColor: primaryColor,
                                    borderWidth: 2,
                                },
                            ]}
                        >
                            <Text style={[styles.clienteNombre, { color: textPrimary }]}>
                                {cliente.nombre} {cliente.apellido}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Búsqueda de Productos */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>PRODUCTOS *</Text>
                <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor }]}>
                    <Ionicons name="search" size={20} color={textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: textPrimary }]}
                        placeholder="Buscar producto..."
                        placeholderTextColor={textSecondary}
                        value={searchProducto}
                        onChangeText={setSearchProducto}
                    />
                </View>

                {searchProducto && (
                    <View style={styles.productosSearch}>
                        {filteredProductos.slice(0, 5).map(producto => (
                            <Pressable
                                key={producto.id_producto}
                                onPress={() => handleAddProducto(producto)}
                                style={[styles.productoSearchItem, { backgroundColor: cardBg, borderColor }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.productoNombre, { color: textPrimary }]}>
                                        {producto.nombre}
                                    </Text>
                                    <Text style={[styles.productoCategoria, { color: textSecondary }]}>
                                        {producto.categoria}
                                    </Text>
                                </View>
                                <Text style={[styles.productoPrecio, { color: primaryColor }]}>
                                    ${producto.precio.toLocaleString()}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Productos Seleccionados */}
                {selectedProductos.length > 0 && (
                    <>
                        <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                            PRODUCTOS AGREGADOS ({selectedProductos.length})
                        </Text>
                        {selectedProductos.map(producto => (
                            <View
                                key={producto.id_producto}
                                style={[styles.productoCard, { backgroundColor: cardBg, borderColor }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.productoNombre, { color: textPrimary }]}>
                                        {producto.nombre}
                                    </Text>
                                    <Text style={[styles.productoCategoria, { color: textSecondary }]}>
                                        ${producto.precio.toLocaleString()} x {producto.cantidad}
                                    </Text>
                                </View>
                                <View style={styles.cantidadControls}>
                                    <Pressable
                                        onPress={() => handleChangeCantidad(producto.id_producto, producto.cantidad - 1)}
                                        style={[styles.cantidadButton, { backgroundColor: primaryColor }]}
                                    >
                                        <Ionicons name="remove" size={16} color="#FFF" />
                                    </Pressable>
                                    <Text style={[styles.cantidadText, { color: textPrimary }]}>
                                        {producto.cantidad}
                                    </Text>
                                    <Pressable
                                        onPress={() => handleChangeCantidad(producto.id_producto, producto.cantidad + 1)}
                                        style={[styles.cantidadButton, { backgroundColor: primaryColor }]}
                                    >
                                        <Ionicons name="add" size={16} color="#FFF" />
                                    </Pressable>
                                </View>
                                <Pressable
                                    onPress={() => handleRemoveProducto(producto.id_producto)}
                                    style={styles.removeButton}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </Pressable>
                            </View>
                        ))}
                    </>
                )}

                {/* Resumen */}
                {selectedProductos.length > 0 && (
                    <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: primaryColor }]}>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal:</Text>
                            <Text style={[styles.summaryValue, { color: textPrimary }]}>
                                ${subtotal.toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Comisión:</Text>
                            <Text style={[styles.summaryValue, { color: textPrimary }]}>
                                ${comision.toLocaleString()}
                            </Text>
                        </View>
                        <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
                            <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
                            <Text style={[styles.totalAmount, { color: primaryColor }]}>
                                ${total.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Botón Crear */}
            <View style={[styles.footer, { backgroundColor: bg, borderTopColor: borderColor }]}>
                <Pressable
                    onPress={handleSubmit}
                    disabled={submitting || !selectedCliente || selectedProductos.length === 0}
                    style={({ pressed }) => [
                        styles.submitButton,
                        { backgroundColor: primaryColor },
                        (submitting || pressed || !selectedCliente || selectedProductos.length === 0) && {
                            opacity: 0.6,
                        },
                    ]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                            <Text style={styles.submitText}>Crear Cuenta</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: { marginRight: 16 },
    title: { fontSize: 24, fontWeight: '900' },
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
    horizontalScroll: { marginBottom: 10 },
    clienteCard: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    clienteNombre: { fontSize: 14, fontWeight: '700' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 12,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
    productosSearch: { marginBottom: 16 },
    productoSearchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    productoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    productoNombre: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
    productoCategoria: { fontSize: 12 },
    productoPrecio: { fontSize: 16, fontWeight: '800' },
    cantidadControls: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
    cantidadButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cantidadText: { fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
    removeButton: { padding: 4 },
    summaryCard: { borderRadius: 20, padding: 20, marginTop: 20, borderWidth: 2 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryValue: { fontSize: 14, fontWeight: '700' },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    totalLabel: { fontSize: 16, fontWeight: '900' },
    totalAmount: { fontSize: 24, fontWeight: '900' },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    submitButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginLeft: 8 },
});
