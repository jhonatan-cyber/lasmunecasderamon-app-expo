import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { ClientSelectModal } from '../../../components/cajero/forms/ClientSelectModal';
import { HostessSelectModal } from '../../../components/cajero/forms/HostessSelectModal';
import { PaymentMethod, PaymentMethodSelect } from '../../../components/cajero/forms/PaymentMethodSelect';
import { RoomSelectModal } from '../../../components/cajero/forms/RoomSelectModal';

export default function NuevoServicioScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Data State
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [anfitrionas, setAnfitrionas] = useState<any[]>([]);
    const [habitaciones, setHabitaciones] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);

    // Form State
    const [selectedHostesses, setSelectedHostesses] = useState<number[]>([]);
    const [selectedClients, setSelectedClients] = useState<number[]>([]);
    const [selectedHabitacion, setSelectedHabitacion] = useState<any>(null);
    const [precioServicio, setPrecioServicio] = useState<string>('0');
    const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');
    const [submitting, setSubmitting] = useState(false);

    // Modals
    const [hostessModalVisible, setHostessModalVisible] = useState(false);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [clientModalVisible, setClientModalVisible] = useState(false);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000
        });
    };

    const fetchInitialData = useCallback(async () => {
        setLoadingInitial(true);
        try {
            const [cajaRes, anfitrionasRes, roomsRes, clientsRes] = await Promise.all([
                apiClient('/cashregister/status'),
                apiClient('/users?anfitrionas=1'),
                apiClient('/rooms'),
                apiClient('/clients')
            ]);

            setCajaAbierta(cajaRes.success && cajaRes.data.hasOpenCaja);
            if (anfitrionasRes.success) setAnfitrionas(anfitrionasRes.data);
            if (roomsRes.success) setHabitaciones(roomsRes.data);
            if (Array.isArray(clientsRes)) {
                setClientes(clientsRes);
            } else if (clientsRes && clientsRes.success) {
                setClientes(clientsRes.data || []);
            }

            if (!cajaRes.success || !cajaRes.data.hasOpenCaja) {
                showToast('Caja Cerrada', 'Debes abrir una caja antes de crear servicios.', 'error');
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
            showToast('Error', 'No se pudo cargar la información necesaria.');
        } finally {
            setLoadingInitial(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const hasAnfitrionaComision = useMemo(() => selectedHabitacion && (selectedHabitacion.comision_anfitriona ?? 0) > 0, [selectedHabitacion]);

    const maxHostesses = useMemo(() => hasAnfitrionaComision ? Math.min(3, 4 - selectedClients.length) : 10, [hasAnfitrionaComision, selectedClients.length]);
    const maxClients = useMemo(() => hasAnfitrionaComision ? 4 - selectedHostesses.length : 4, [hasAnfitrionaComision, selectedHostesses.length]);

    const numericPrecioServicio = parseInt(precioServicio.replace(/\./g, '')) || 0;

    const totals = useMemo(() => {
        const numAnfitrionas = selectedHostesses.length || 1;
        const numClientes = selectedClients.length || 1;
        const tieneComision = (selectedHabitacion?.comision_anfitriona ?? 0) > 0;

        // Multiplicador por tiempo: si es 60 minutos, todo se duplica (como en la web)
        const multiplicadorTiempo = (selectedHabitacion?.tiempo === 60) ? 2 : 1;

        let multiplicadorServicio = numAnfitrionas;
        let multiplicadorHabitacion = numAnfitrionas;

        // REGLA WEB: Para habitaciones con comisión
        if (tieneComision) {
            // REGLA: Para habitaciones con comisión, NO multiplicar por número de clientes ni anfitrionas
            // El precio es por habitación, no por persona
            multiplicadorServicio = 1;
            multiplicadorHabitacion = 1;
        } else if (numClientes > numAnfitrionas) {
            // Si no hay comisión y hay más clientes que anfitrionas
            multiplicadorServicio = numClientes;
            multiplicadorHabitacion = numClientes;
        }

        const precioServicioBase = numericPrecioServicio * multiplicadorTiempo;
        const precioHabitacionBase = (selectedHabitacion?.precio || 0) * multiplicadorTiempo;

        const subTotalServicio = precioServicioBase * multiplicadorServicio;
        const subTotalHabitacion = precioHabitacionBase * multiplicadorHabitacion;
        const subTotalGeneral = subTotalServicio + subTotalHabitacion;

        let calculatedIva = 0;
        // REGLA WEB: Si hay comisión, el IVA siempre es 0 (incluso con tarjeta)
        if (metodoPago === 'tarjeta' && !tieneComision) {
            calculatedIva = Math.floor(subTotalServicio * 0.20);
        }

        let currentTotal = subTotalGeneral + calculatedIva;

        // Redondeo solo si es tarjeta y NO tiene comisión
        if (metodoPago === 'tarjeta' && !tieneComision) {
            const totalRedondeado = Math.ceil(currentTotal / 5000) * 5000;
            const excedente = totalRedondeado - currentTotal;
            currentTotal = totalRedondeado;
            calculatedIva += excedente;
        }

        return {
            subTotal: subTotalGeneral,
            iva: calculatedIva,
            total: currentTotal,
            precioHabitacionActual: subTotalHabitacion
        };
    }, [numericPrecioServicio, selectedHostesses.length, selectedClients.length, selectedHabitacion, metodoPago]);

    const generateCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const toggleHostess = (hostessId: number) => {
        setSelectedHostesses(prev => prev.includes(hostessId) ? prev.filter(id => id !== hostessId) : (prev.length < maxHostesses ? [...prev, hostessId] : (showToast('Límite', `Máximo ${maxHostesses} anfitrionas`), prev)));
    };

    const toggleClient = (clientId: number) => {
        setSelectedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : (prev.length < maxClients ? [...prev, clientId] : (showToast('Límite', `Máximo ${maxClients} clientes`), prev)));
    };

    const handleSubmit = async () => {
        if (!cajaAbierta) { showToast('Caja Cerrada', 'Abre una caja primero.'); return; }
        if (!selectedHabitacion) { showToast('Falta Datos', 'Selecciona una habitación.'); return; }
        if (selectedHostesses.length === 0) { showToast('Falta Datos', 'Selecciona al menos una anfitriona.'); return; }

        setSubmitting(true);
        try {
            const payload = {
                codigo: generateCode(),
                cliente_id: selectedClients.length > 0 ? selectedClients[0] : null,
                clientes: selectedClients,
                habitacion_id: selectedHabitacion.id_habitacion || selectedHabitacion.id,
                precio_habitacion: totals.precioHabitacionActual,
                precio_servicio: numericPrecioServicio,
                iva: totals.iva,
                sub_total: totals.subTotal,
                total: totals.total,
                tiempo: selectedHabitacion.tiempo || 0,
                metodo_pago: metodoPago,
                usuarios: selectedHostesses
            };

            const res = await apiClient('/servicios', { method: 'POST', body: JSON.stringify(payload) });
            if (res.success) {
                showToast('Éxito', 'Servicio creado correctamente', 'success');
                setTimeout(() => router.replace('/cajero/servicios' as any), 1500);
            } else {
                showToast('Error', res.message || 'No se pudo crear el servicio');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast('Error', 'Ocurrió un error al procesar el servicio.');
        } finally { setSubmitting(false); }
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
            <View style={[styles.header, { backgroundColor: cardBg, paddingTop: insets.top + 10, paddingBottom: 15 }]}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => router.replace('/cajero/servicios' as any)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={textPrimary} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: textPrimary, marginLeft: 10 }]}>Nuevo Servicio</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>Formulario de Servicio</Text>

                    <Pressable style={[styles.selectorBtn, { borderColor }]} onPress={() => setRoomModalVisible(true)}>
                        <Ionicons name="business" size={22} color="#8B5CF6" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary }]}>Habitación (Requerido)</Text>
                            <Text style={[styles.selectorVal, { color: textPrimary }]}>{selectedHabitacion?.nombre || 'Seleccionar habitación'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>

                    <Pressable style={[styles.selectorBtn, { borderColor, marginTop: 12 }]} onPress={() => setHostessModalVisible(true)}>
                        <Ionicons name="people" size={22} color="#10B981" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary }]}>Anfitrionas ({selectedHostesses.length})</Text>
                            <Text style={[styles.selectorVal, { color: textPrimary }]}>
                                {selectedHostesses.length > 0
                                    ? selectedHostesses.map(id => anfitrionas.find(a => (a.id_usuario || a.id) === id)?.nick).join(', ')
                                    : 'Seleccionar anfitrionas'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>

                    <Pressable style={[styles.selectorBtn, { borderColor, marginTop: 12 }]} onPress={() => setClientModalVisible(true)}>
                        <Ionicons name="person" size={22} color="#3B82F6" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary }]}>Clientes ({selectedClients.length})</Text>
                            <Text style={[styles.selectorVal, { color: textPrimary }]}>
                                {selectedClients.length > 0
                                    ? selectedClients.map(id => {
                                        const cl = clientes.find(c => (c.id_cliente || c.id) === id);
                                        return cl ? `${cl.nombre || cl.name || ''} ${cl.apellido || cl.last_name || ''}`.trim() : 'Cliente';
                                    }).join(', ')
                                    : 'Seleccionar clientes (Opcional)'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>

                    <View style={{ marginTop: 20 }}>
                        <Text style={[styles.inputGroupLabel, { color: textSecondary }]}>PRECIO DE SERVICIO</Text>
                        <View style={[styles.inputWrapper, { borderColor }]}>
                            <Ionicons name="cash-outline" size={20} color={textSecondary} />
                            <TextInput
                                style={[styles.textInput, { color: textPrimary }, hasAnfitrionaComision && { opacity: 0.5 }]}
                                placeholder="0"
                                placeholderTextColor={textSecondary}
                                keyboardType="numeric"
                                value={precioServicio}
                                editable={!hasAnfitrionaComision}
                                onChangeText={(val) => {
                                    const clean = val.replace(/[^0-9]/g, '');
                                    setPrecioServicio(clean === '' ? '0' : parseInt(clean).toLocaleString('es-CL').replace(/,/g, '.'));
                                }}
                            />
                        </View>
                    </View>

                    <PaymentMethodSelect
                        selectedMethod={metodoPago}
                        onSelect={setMetodoPago}
                    />
                </View>

                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderTopColor: borderColor }]}>
                    <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text><Text style={[styles.summaryVal, { color: textPrimary }]}>${totals.subTotal.toLocaleString()}</Text></View>
                    {metodoPago === 'tarjeta' && <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: textSecondary }]}>Impuesto IVA (20%)</Text><Text style={[styles.summaryVal, { color: '#10B981' }]}>+${totals.iva.toLocaleString()}</Text></View>}
                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}><Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL SERVICIO</Text><Text style={styles.totalValFinal}>${totals.total.toLocaleString()}</Text></View>
                    <Pressable style={[styles.submitBtn, { backgroundColor: '#8B5CF6' }, (submitting || !cajaAbierta) && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting || !cajaAbierta}>
                        {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="rocket" size={24} color="#FFF" style={{ marginRight: 8 }} /><Text style={styles.submitBtnText}>Generar Servicio</Text></>}
                    </Pressable>
                </View>
            </ScrollView>

            <RoomSelectModal
                visible={roomModalVisible}
                rooms={habitaciones.filter(room =>
                    (room.precio && room.precio > 0) ||
                    (room.tiempo && room.tiempo > 0)
                )}
                selectedRoomId={selectedHabitacion?.id_habitacion || selectedHabitacion?.id}
                onClose={() => setRoomModalVisible(false)}
                onSelect={(room) => {
                    setSelectedHabitacion(room);
                    setRoomModalVisible(false);
                }}
            />

            <HostessSelectModal
                visible={hostessModalVisible}
                hostesses={anfitrionas}
                selectedIds={selectedHostesses}
                max={maxHostesses}
                onClose={() => setHostessModalVisible(false)}
                onToggle={toggleHostess}
            />

            <ClientSelectModal
                visible={clientModalVisible}
                clients={clientes}
                selectedIds={selectedClients}
                max={maxClients}
                onClose={() => setClientModalVisible(false)}
                onToggle={toggleClient}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 20, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 },
    selectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
    selectorLabel: { fontSize: 12, fontWeight: '700' },
    selectorVal: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    inputGroupLabel: { fontSize: 11, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 54 },
    textInput: { flex: 1, marginLeft: 10, fontSize: 18, fontWeight: '700' },
    summaryCard: { marginTop: 10, padding: 24, borderRadius: 32, borderWidth: 1, elevation: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabelFinal: { fontSize: 16, fontWeight: '900' },
    totalValFinal: { fontSize: 28, fontWeight: '900', color: '#8B5CF6' },
    submitBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
});
