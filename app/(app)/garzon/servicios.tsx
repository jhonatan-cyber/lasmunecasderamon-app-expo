import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { RoomSelectModal } from '@/components/cajero/forms/RoomSelectModal';
import { HostessSelectModal } from '@/components/cajero/forms/HostessSelectModal';
import { ClientSelectModal } from '@/components/cajero/forms/ClientSelectModal';
import { Skeleton } from '@/components/ui/Skeleton';

interface Room {
    id: number;
    id_habitacion?: number;
    name: string;
    numero: string;
    nombre?: string;
    price: number;
    precio?: number;
    time: number;
    tiempo?: number;
    status: number;
    comision_anfitriona?: number;
}

interface Anfitriona {
    id: number;
    id_usuario?: number;
    nick: string;
    name: string;
    nombre?: string;
    foto: string;
    estado_servicio?: number;
}

interface Client {
    id: number;
    id_cliente?: number;
    name: string;
    nombre?: string;
    lastName: string;
    apellido?: string;
    saldo?: number;
}

export default function ServiciosScreen() {
    const { accentColor, gradientColors } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const primaryColor = accentColor;

    // Data states
    const [rooms, setRooms] = useState<Room[]>([]);
    const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const dataRef = useRef<string>('');

    // Form states
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [selectedHostesses, setSelectedHostesses] = useState<(number | string)[]>([]);
    const [selectedClients, setSelectedClients] = useState<(number | string)[]>([]);
    const [servicePrice, setServicePrice] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | ''>('');
    const [iva, setIva] = useState<string>('0');
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [hostessModalVisible, setHostessModalVisible] = useState(false);
    const [clientModalVisible, setClientModalVisible] = useState(false);

    const { bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();

    // Fetch data
    const fetchData = useCallback(async (isRefreshing = false) => {
        try {
            if (!isRefreshing) setLoading(true);
            const [roomRes, anfRes, clientRes] = await Promise.allSettled([
                apiClient('/rooms'),
                apiClient('/users?anfitrionas=1'),
                apiClient('/clients'),
            ]);

            const roomData = roomRes.status === 'fulfilled' ? roomRes.value : null;
            const anfData = anfRes.status === 'fulfilled' ? anfRes.value : null;
            const clientData = clientRes.status === 'fulfilled' ? clientRes.value : null;

            const deduplicate = (arr: any[], idKey: string) => {
                if (!Array.isArray(arr)) return [];
                const seen = new Set();
                return arr.filter(item => {
                    const id = item[idKey] || item.id;
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });
            };

            const rawAnf = anfData?.data || [];
            const rawClients = Array.isArray(clientData) ? clientData : (clientData?.data || []);
            const newData = { rooms: roomData?.data, anfitrionas: rawAnf, clients: rawClients };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            setRooms(roomData?.data || []);
            
            // Unir las nuevas con las que ya tengamos seleccionadas para no perder sus datos (nicks, etc)
            setAnfitrionas(prev => {
                const combined = [...(rawAnf || []), ...(prev || [])];
                return deduplicate(combined, 'id_usuario');
            });
            setClients(deduplicate(rawClients, 'id_cliente'));

            if (isRefreshing) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: isRefreshing ? 'No se pudieron actualizar los datos' : 'No se pudieron cargar los datos necesarios',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const toggleHostess = (hostessId: string | number) => {
        const isSelected = selectedHostesses.some(id => String(id) === String(hostessId));
        let next;
        
        if (isSelected) {
            next = selectedHostesses.filter((id) => String(id) !== String(hostessId));
        } else {
            if (selectedHostesses.length >= maxHostesses) {
                Toast.show({
                    type: 'info',
                    text1: 'Límite alcanzado',
                    text2: `Máximo ${maxHostesses} anfitrionas permitidas`
                });
                return;
            }
            next = [...selectedHostesses, hostessId];
        }

        const uniqueNext = Array.from(new Set(next.map(id => String(id))))
            .map(idStr => next.find(id => String(id) === idStr) || idStr);

        setSelectedHostesses(uniqueNext as any);
    };

    const toggleClient = (clientId: string | number) => {
        const isSelected = selectedClients.some(id => String(id) === String(clientId));
        let next;

        if (isSelected) {
            next = selectedClients.filter((id) => String(id) !== String(clientId));
        } else {
            if (selectedClients.length >= maxClients) {
                Toast.show({
                    type: 'info',
                    text1: 'Límite alcanzado',
                    text2: `Máximo ${maxClients} clientes permitidos`
                });
                return;
            }
            next = [...selectedClients, clientId];
        }

        const uniqueNext = Array.from(new Set(next.map(id => String(id))))
            .map(idStr => next.find(id => String(id) === idStr) || idStr);

        setSelectedClients(uniqueNext as any);
    };

    // Helpers from web logic
    const hasComision = useMemo(() => {
        return selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0;
    }, [selectedRoom]);

    useEffect(() => {
        if (hasComision) {
            setServicePrice('');
        }
    }, [hasComision]);

    const maxHostesses = useMemo(() => {
        if (!hasComision) return 10;
        // Regla: Máximo 3 anfitrionas. 
        // Además, Total (Anf + Cli) <= 4. Si no hay clientes, se asume 1 cupo para el cálculo.
        const effectiveClients = Math.max(1, selectedClients.length);
        const limitByTotal = 4 - effectiveClients;
        return Math.min(3, limitByTotal);
    }, [hasComision, selectedClients.length]);

    const maxClients = useMemo(() => {
        if (!hasComision) return 10;
        // Regla: Total <= 4. Siempre debe haber espacio para al menos 1 anfitriona.
        const effectiveHostesses = Math.max(1, selectedHostesses.length);
        return 4 - effectiveHostesses;
    }, [hasComision, selectedHostesses.length]);

    const activeClientWithBalance = useMemo(() => {
        if (selectedClients.length === 0) return null;
        const mainClientId = selectedClients[0];
        const client = clients.find(c => String(c.id_cliente || c.id) === String(mainClientId));
        return (client && (client.saldo || 0) > 0) ? client : null;
    }, [selectedClients, clients]);

    const hasPrepago = !!activeClientWithBalance;

    useEffect(() => {
        if (hasPrepago) {
            setPaymentMethod('prepago');
        } else if (paymentMethod === 'prepago') {
            setPaymentMethod('');
        }
    }, [hasPrepago, paymentMethod]);

    // Calculation logic (simplified version of web version)
    const totals = useMemo(() => {
        const price = parseInt(servicePrice.replace(/\./g, '')) || 0;
        const roomPrice = selectedRoom ? (selectedRoom.precio || selectedRoom.price || 0) : 0;

        const cantAnfitrionas = selectedHostesses.length || 1;
        const cantClientes = selectedClients.length || 1;

        let multServicio = cantAnfitrionas;
        let multHabitacion = cantAnfitrionas;

        if (cantClientes > cantAnfitrionas && selectedRoom && (selectedRoom.comision_anfitriona ?? 0) === 0) {
            multServicio = cantClientes;
            multHabitacion = cantClientes;
        }

        if (selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0) {
            multHabitacion = 1;
        }

        const subtotal = price * multServicio;
        const totalHabitacion = roomPrice * multHabitacion;

        let currentIva = 0;
        if (paymentMethod === 'tarjeta') {
            // El IVA del 20% se calcula únicamente sobre el subtotal del servicio (no incluye habitación)
            currentIva = Math.floor(subtotal * 0.20);
        }

        let total = subtotal + totalHabitacion + currentIva;

        if (paymentMethod === 'tarjeta' && !hasComision) {
            const totalRedondeado = Math.ceil(total / 5000) * 5000;
            const excedente = totalRedondeado - total;
            total = totalRedondeado;
            currentIva += excedente;
        }

        const comisionTotal = selectedRoom ? (selectedRoom.comision_anfitriona || 0) : 0;
        const comisionPorAnfitriona = (comisionTotal > 0 && selectedHostesses.length > 0) 
            ? Math.floor(comisionTotal / selectedHostesses.length) 
            : comisionTotal;

        return { subtotal, totalHabitacion, total, iva: currentIva, comisionPorAnfitriona };
    }, [servicePrice, selectedRoom, selectedHostesses.length, selectedClients.length, paymentMethod, hasComision]);

    useEffect(() => {
        setIva(totals.iva.toString());
    }, [totals.iva]);

    const handleSubmit = async () => {
        if (!selectedRoom) return Alert.alert('Error', 'Selecciona una habitación');
        if (selectedHostesses.length === 0) return Alert.alert('Error', 'Selecciona al menos una anfitriona');
        if (!paymentMethod) return Alert.alert('Error', 'Selecciona un método de pago');

        // El precio de servicio es obligatorio SOLO si la habitación NO tiene comisión
        if (!hasComision && (!servicePrice || servicePrice === '0')) {
            return Alert.alert('Error', 'Ingresa el precio del servicio');
        }

        const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        setSubmitting(true);
        try {
            const codigo = generateCode();
            const payload = {
                codigo,
                cliente_id: selectedClients.length > 0 ? selectedClients[0] : null,
                clientes: selectedClients,
                habitacion_id: selectedRoom.id_habitacion || selectedRoom.id,
                precio_servicio: parseInt(servicePrice.replace(/\./g, '')) || 0,
                precio_habitacion: selectedRoom.precio || selectedRoom.price || 0,
                comision_anfitriona: selectedRoom.comision_anfitriona || 0,
                usuarios: selectedHostesses,
                anfitrionas_ids: selectedHostesses,
                metodo_pago: paymentMethod,
                tiempo: selectedRoom.tiempo || selectedRoom.time || 0,
                total: totals.total,
                iva: totals.iva,
                num_clientes: selectedClients.length || 1,
            };

            const res = await apiClient('/solicitudes-servicios', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Solicitud Enviada',
                    text2: 'La solicitud de servicio ha sido enviada a caja',
                });
                router.back();
            } else {
                Alert.alert('Error', res.message || 'No se pudo crear el servicio');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const formatNumber = (val: string) => {
        const num = val.replace(/\D/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const ServiciosSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <LinearGradient
                colors={gradientColors as any}
                style={[styles.header, {
                    paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                    paddingBottom: 25,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    height: 160
                }]}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 20 }}>
                    <Skeleton width={150} height={30} />
                    <Skeleton width={44} height={44} borderRadius={22} />
                </View>
                <View style={{ paddingHorizontal: 20 }}>
                    <Skeleton width="60%" height={24} />
                </View>
            </LinearGradient>

            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={{ marginBottom: 20, gap: 10 }}>
                        <Skeleton width={100} height={18} />
                        <Skeleton width="100%" height={56} borderRadius={16} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );

    if (loading) return <ServiciosSkeleton />;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: bg }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
            >
                <PremiumHeader 
                    title="Servicios"
                    subtitle="Registrar nuevo servicio en habitación"
                    rightComponent={
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextHeader}>Atrás</Text>
                        </Pressable>
                    }
                />

                <View style={{ padding: 20 }}>

                {/* Habitaciones */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                <Pressable 
                    onPress={() => setRoomModalVisible(true)}
                    style={[styles.selectField, { backgroundColor: cardBg, borderColor: selectedRoom ? primaryColor : borderColor }]}
                >
                    <View style={styles.selectFieldContent}>
                        <Ionicons name="business-outline" size={20} color={selectedRoom ? primaryColor : textSecondary} />
                        <Text style={[styles.selectFieldText, { color: selectedRoom ? textPrimary : textSecondary }]}>
                            {selectedRoom 
                                ? `${selectedRoom.nombre || selectedRoom.name || selectedRoom.numero} - $${(selectedRoom.precio || selectedRoom.price || 0).toLocaleString()}`
                                : 'Seleccionar habitación...'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={textSecondary} />
                </Pressable>

                <RoomSelectModal 
                    visible={roomModalVisible}
                    onClose={() => setRoomModalVisible(false)}
                    onSelect={(room) => {
                        setSelectedRoom(room as any);
                        setRoomModalVisible(false);
                    }}
                    rooms={rooms.filter(r => 
                        r.status === 1 && 
                        (r.precio || r.price || 0) > 0 && 
                        (r.tiempo || r.time || 0) > 0
                    ).map(r => ({
                        ...r,
                        nombre: r.nombre || r.name || r.numero,
                        precio: r.precio || r.price || 0,
                        tiempo: r.tiempo || r.time || 0,
                        estado: r.status
                    }))}
                    selectedRoomId={selectedRoom?.id_habitacion || selectedRoom?.id}
                />

                {hasComision && (
                    <View style={{ backgroundColor: primaryColor + '15', padding: 12, borderRadius: 16, marginTop: 15, borderWidth: 1, borderColor: primaryColor + '40' }}>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                            ✨ Límite: Máx 3 Anfitrionas y 4 personas en total
                        </Text>
                    </View>
                )}

                {/* Anfitrionas */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    ANFITRIONAS {hasComision && `(MÁX ${maxHostesses})`}
                </Text>
                <Pressable 
                    onPress={() => setHostessModalVisible(true)}
                    style={[styles.selectField, { backgroundColor: cardBg, borderColor: selectedHostesses.length > 0 ? primaryColor : borderColor }]}
                >
                    <View style={styles.selectFieldContent}>
                        <Ionicons name="people-outline" size={20} color={selectedHostesses.length > 0 ? primaryColor : textSecondary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.selectFieldText, { color: selectedHostesses.length > 0 ? textPrimary : textSecondary }]} numberOfLines={1}>
                                {selectedHostesses.length > 0 
                                    ? selectedHostesses.map(id => {
                                        const anf = anfitrionas.find(a => 
                                            String(a.id_usuario || a.id) === String(id)
                                        );
                                        return anf?.nick || anf?.nombre || anf?.name || '';
                                    }).filter(Boolean).join(', ')
                                    : 'Seleccionar anfitrionas...'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={textSecondary} />
                </Pressable>

                <HostessSelectModal 
                    visible={hostessModalVisible}
                    onClose={() => setHostessModalVisible(false)}
                    onConfirm={() => setHostessModalVisible(false)}
                    onToggle={toggleHostess}
                    hostesses={anfitrionas as any}
                    selectedIds={selectedHostesses}
                    max={maxHostesses}
                />

                {/* Clientes */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    CLIENTES (OPCIONAL {hasComision && `- MÁX ${maxClients}`})
                </Text>
                <Pressable 
                    onPress={() => setClientModalVisible(true)}
                    style={[styles.selectField, { backgroundColor: cardBg, borderColor: selectedClients.length > 0 ? primaryColor : borderColor }]}
                >
                    <View style={styles.selectFieldContent}>
                        <Ionicons name="person-outline" size={20} color={selectedClients.length > 0 ? primaryColor : textSecondary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.selectFieldText, { color: selectedClients.length > 0 ? textPrimary : textSecondary }]} numberOfLines={1}>
                                {selectedClients.length > 0 
                                    ? selectedClients.map(id => {
                                        const cli = clients.find(c => 
                                            String(c.id_cliente) === String(id) || 
                                            String(c.id) === String(id)
                                        );
                                        return `${cli?.nombre || cli?.name || ''} ${cli?.apellido || cli?.lastName || ''}`.trim();
                                    }).filter(Boolean).join(', ')
                                    : 'Seleccionar clientes...'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={textSecondary} />
                </Pressable>

                <ClientSelectModal 
                    visible={clientModalVisible}
                    onClose={() => setClientModalVisible(false)}
                    onToggle={toggleClient}
                    clients={clients as any}
                    selectedIds={selectedClients}
                    max={maxClients}
                />

                {/* Precios y Pagos */}
                <View style={styles.formSection}>
                    {!hasComision && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: textSecondary }]}>
                                PRECIO DE SERVICIO
                            </Text>
                            <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                                <Text style={{ color: textSecondary, fontSize: 18, marginRight: 8 }}>$</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                    keyboardType="numeric"
                                    value={servicePrice}
                                    onChangeText={(val) => setServicePrice(formatNumber(val))}
                                />
                            </View>
                        </View>
                    )}

                    {!hasPrepago && (
                        <>
                            <Text style={[styles.sectionLabel, { color: textSecondary }]}>MÉTODO DE PAGO</Text>
                            <View style={styles.methodContainer}>
                                {['efectivo', 'tarjeta', 'transferencia'].map((m) => (
                                    <Pressable
                                        key={m}
                                        onPress={() => setPaymentMethod(m as any)}
                                        style={[
                                            styles.methodBtn,
                                            { backgroundColor: cardBg, borderColor: paymentMethod === m ? primaryColor : borderColor },
                                            paymentMethod === m && { borderWidth: 2 }
                                        ]}
                                    >
                                        <Text style={[styles.methodText, { color: paymentMethod === m ? primaryColor : textPrimary }]}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    {hasPrepago && (
                        <View style={{ backgroundColor: '#10B98115', padding: 15, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#10B981' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name="wallet" size={20} color="#10B981" />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 14 }}>
                                        PAGO AUTOMÁTICO CON SALDO
                                    </Text>
                                    <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 12 }}>
                                        Saldo disponible: ${(activeClientWithBalance?.saldo || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {paymentMethod === 'tarjeta' && !hasComision && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: textSecondary }]}>IVA (INC. REDONDEO)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor, opacity: 0.7 }]}>
                                <Text style={{ color: textSecondary, fontSize: 18, marginRight: 8 }}>$</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    value={formatNumber(iva)}
                                    editable={false}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Resumen Final */}
                <View style={[styles.summaryCard, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal:</Text>
                        <Text style={[styles.summaryValue, { color: textPrimary }]}>${totals.subtotal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Habitación:</Text>
                        <Text style={[styles.summaryValue, { color: textPrimary }]}>${totals.totalHabitacion.toLocaleString()}</Text>
                    </View>
                    {hasComision && selectedHostesses.length > 0 && (
                        <View style={[styles.summaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: primaryColor + '20' }]}>
                            <Text style={[styles.summaryLabel, { color: '#10B981', fontWeight: '800' }]}>Comisión p/Anf:</Text>
                            <Text style={[styles.summaryValue, { color: '#10B981', fontWeight: '800' }]}>
                                ${totals.comisionPorAnfitriona.toLocaleString()} x {selectedHostesses.length}
                            </Text>
                        </View>
                    )}
                    {paymentMethod === 'tarjeta' && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>IVA/Ajuste:</Text>
                            <Text style={[styles.summaryValue, { color: textPrimary }]}>${totals.iva.toLocaleString()}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, { borderTopColor: primaryColor + '30' }]}>
                        <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
                        <Text style={[styles.totalAmount, { color: primaryColor }]}>${totals.total.toLocaleString()}</Text>
                    </View>
                </View>

                <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={({ pressed }) => [
                        styles.submitBtn,
                        { backgroundColor: primaryColor },
                        (submitting || pressed) && { opacity: 0.8 }
                    ]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.submitText}>SOLICITAR SERVICIO</Text>
                        </>
                    )}
                </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        paddingHorizontal: 20,
    },
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    title: { fontSize: 22, fontWeight: '900', flex: 1 },
    selectField: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    selectFieldContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    selectFieldText: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
    formSection: { gap: 10 },
    inputGroup: { gap: 8 },
    inputLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    inputWrapper: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    input: { flex: 1, fontSize: 18, fontWeight: '700' },
    methodContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    methodBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    methodText: { fontSize: 12, fontWeight: '800' },
    summaryCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginVertical: 20, gap: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryValue: { fontSize: 14, fontWeight: '700' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 15, borderTopWidth: 1 },
    totalLabel: { fontSize: 18, fontWeight: '900' },
    totalAmount: { fontSize: 24, fontWeight: '900' },
    submitBtn: { height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
