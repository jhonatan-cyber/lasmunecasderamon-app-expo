import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Timer } from '@/context/TimerContext';
import { HostessSelectModal } from '@/components/cajero/forms/HostessSelectModal';
import { PaymentMethodSelect, type PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import { TimeSelector } from '@/components/ui/TimeSelector';
import { parseDateSafe } from '@/utils/timeUtils';

interface Anfitriona {
    id_usuario: number;
    nombre: string;
    apellido: string;
    nick: string;
    status?: number;
}

interface EditServiceModalProps {
    visible: boolean;
    onClose: () => void;
    timer: Timer | null;
    onSuccess: () => void;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
    visible,
    onClose,
    timer,
    onSuccess,
}) => {
    const { isDark, cardBg, borderColor, accentColor: accent } = useAccentColor();
    const accentColor = accent;
    const bg = isDark ? '#111827' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const [loading, setLoading] = useState(false);
    const [, setLoadingAnfitrionas] = useState(false);
    const [tiempo, setTiempo] = useState<number>(30);
    const [precioServicio, setPrecioServicio] = useState<string>('0');
    const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');
    const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<Anfitriona[]>([]);
    const [anfitrionasSeleccionadas, setAnfitrionasSeleccionadas] = useState<(string | number)[]>([]);
    const [showHostessModal, setShowHostessModal] = useState(false);
    const [precioHabitacionSinComision, setPrecioHabitacionSinComision] = useState<number>(0);

    const fetchHabitacionSinComision = useCallback(async () => {
        try {
            const res = await apiClient('/rooms');
            console.log('[EditServiceModal] Respuesta habitaciones:', JSON.stringify(res, null, 2));

            if (res.success && Array.isArray(res.data)) {
                console.log('[EditServiceModal] Total habitaciones:', res.data.length);

                res.data.forEach((h: any, index: number) => {
                    console.log(`[EditServiceModal] Habitación ${index}:`, {
                        nombre: h.nombre || h.name,
                        precio: h.precio || h.price,
                        tiempo: h.tiempo || h.time,
                        comision: h.comision_anfitriona
                    });
                });

                const habitacionSinComision = res.data.find((h: any) => {
                    const precio = h.precio || h.price || 0;
                    const tiempo = h.tiempo || h.time || 0;
                    const comision = h.comision_anfitriona || 0;
                    const cumple = comision === 0 && precio > 0 && tiempo > 0;
                    return cumple;
                });

                if (habitacionSinComision) {
                    const precio = habitacionSinComision.precio || habitacionSinComision.price || 0;
                    setPrecioHabitacionSinComision(precio);
                } else {
                    setPrecioHabitacionSinComision(0);
                }
            }
        } catch {
            setPrecioHabitacionSinComision(0);
        }
    }, []);

    const fetchAnfitrionas = useCallback(async () => {
        setLoadingAnfitrionas(true);
        try {
            const disponiblesRes = await apiClient('/anfitrionas/disponibles');
            const servicioRes = await apiClient(`/servicios/${timer?.servicioId}`);
            let todasAnfitrionas: Anfitriona[] = [];

            if (disponiblesRes.success && Array.isArray(disponiblesRes.data)) {
                todasAnfitrionas = [...disponiblesRes.data];
            }

            if (servicioRes.success && servicioRes.data?.usuarios) {
                const anfitrionasServicio = servicioRes.data.usuarios;
                anfitrionasServicio.forEach((anf: Anfitriona) => {
                    if (!todasAnfitrionas.find(a => a.id_usuario === anf.id_usuario)) {
                        todasAnfitrionas.push(anf);
                    }
                });
            }

            setAnfitrionasDisponibles(todasAnfitrionas);
        } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar las anfitrionas' });
        } finally {
            setLoadingAnfitrionas(false);
        }
    }, [timer?.servicioId]);

    useEffect(() => {
        if (visible && timer) {
            setPrecioServicio('0');
            setTiempo(30);
            setMetodoPago('efectivo');
            
            // Prioridad a anfitrionas_ids (array), fallback a split de anfitrionas (string)
            let ids: string[] = [];
            if (timer.anfitrionas_ids && Array.isArray(timer.anfitrionas_ids)) {
                ids = timer.anfitrionas_ids.map(id => String(id));
            } else if (timer.anfitrionas && typeof timer.anfitrionas === 'string') {
                // Si solo tenemos el string, intentamos buscar las disponibles que coincidan con el nick
                // Pero es mejor confiar en los IDs si existen.
            }
            
            setAnfitrionasSeleccionadas(ids);
            fetchAnfitrionas();
            fetchHabitacionSinComision();
        }
    }, [visible, timer, fetchAnfitrionas, fetchHabitacionSinComision]);

    const toggleAnfitriona = (id: string | number) => {
        setAnfitrionasSeleccionadas(prev => {
            const isSelected = prev.some(sid => String(sid) === String(id));
            if (isSelected) {
                return prev.filter(sid => String(sid) !== String(id));
            } else {
                return [...prev, id];
            }
        });
    };

    const getSelectedHostessNames = () => {
        return anfitrionasDisponibles
            .filter(anf => anfitrionasSeleccionadas.some(sid => String(sid) === String(anf.id_usuario)))
            .map(anf => anf.nick)
            .join(', ') || 'Ninguna seleccionada';
    };

    const handleSave = async () => {
        if (!timer) return;
        const timeVal = tiempo;
        if (!timeVal || timeVal <= 0) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'El tiempo debe ser mayor a 0' });
            return;
        }

        if (anfitrionasSeleccionadas.length === 0) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Debe seleccionar al menos una anfitriona' });
            return;
        }

        setLoading(true);
        try {
            const numericPrecio = parseInt(precioServicio.replace(/\./g, '')) || 0;
            const numAnfitrionas = anfitrionasSeleccionadas.length;
            const precioServicioTotal = numericPrecio * numAnfitrionas;
            const precioHabitacionTotal = precioHabitacionSinComision * numAnfitrionas;
            let calculatedIva = 0;
            if (metodoPago === 'tarjeta') {
                calculatedIva = Math.floor(precioServicioTotal * 0.20);
            }

            let totalGeneral = precioServicioTotal + precioHabitacionTotal + calculatedIva;

            if (metodoPago === 'tarjeta') {
                const totalRedondeado = Math.ceil(totalGeneral / 5000) * 5000;
                const excedente = totalRedondeado - totalGeneral;
                totalGeneral = totalRedondeado;
                calculatedIva += excedente;
            }

            const payload = {
                servicio_original_id: String(timer.servicioId),
                cliente_id: timer.cliente_id ? String(timer.cliente_id) : null,
                habitacion_id: String(timer.roomId),
                precio_habitacion: precioHabitacionTotal,
                precio_servicio: precioServicioTotal,
                iva: calculatedIva,
                sub_total: precioServicioTotal,
                total: totalGeneral,
                tiempo: timeVal,
                metodo_pago: metodoPago,
                usuarios: anfitrionasSeleccionadas.map(id => String(id)),
                clientes: timer.cliente_id ? [String(timer.cliente_id)] : [],
                fecha_crea: parseDateSafe(new Date()).toISOString()
            };
            const res = await apiClient('/servicios/temporal', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'Nuevo servicio iniciado (Principal pausado)'
                });
                onSuccess();
                onClose();
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: res.message || 'No se pudo crear el servicio temporal'
                });
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Ocurrió un error inesperado' });
        } finally {
            setLoading(false);
        }
    };

    if (!timer) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: bg }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textPrimary }]}>Añadir Consumo / Servicio</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.infoBox}>
                            <Text style={[styles.infoLabel, { color: textSecondary }]}>Habitación: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{timer.roomName}</Text></Text>
                            <Text style={[styles.infoLabel, { color: textSecondary }]}>Cliente: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{timer.clienteNombre}</Text></Text>
                            <Text style={[styles.infoLabel, { color: textSecondary }]}>Anfitrionas actuales: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{timer.anfitrionas}</Text></Text>
                            <Text style={[styles.infoLabel, { color: textSecondary }]}>
                                Precio habitación: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>
                                    ${(precioHabitacionSinComision || 0).toLocaleString('es-CL')}
                                </Text>
                                {precioHabitacionSinComision === 0 && <Text style={{ color: '#EF4444', fontSize: 11 }}> (No encontrado)</Text>}
                            </Text>
                        </View>

                        {/* Selección de Anfitrionas */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textSecondary }]}>ANFITRIONAS ({anfitrionasSeleccionadas.length} seleccionadas)</Text>
                            <Pressable
                                style={[styles.inputWrapper, { borderColor }]}
                                onPress={() => setShowHostessModal(true)}
                            >
                                <Ionicons name="people-outline" size={20} color={textSecondary} />
                                <Text style={[styles.input, { color: anfitrionasSeleccionadas.length > 0 ? textPrimary : textSecondary }]}>
                                    {getSelectedHostessNames()}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={textSecondary} />
                            </Pressable>
                        </View>

                        <TimeSelector
                            value={tiempo}
                            onChange={setTiempo}
                            label="TIEMPO (MINUTOS)"
                        />

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textSecondary }]}>PRECIO SERVICIO (POR ANFITRIONA)</Text>
                            <View style={[styles.inputWrapper, { borderColor }]}>
                                <Ionicons name="cash-outline" size={20} color={textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    value={precioServicio}
                                    onChangeText={(val) => {
                                        const clean = val.replace(/[^0-9]/g, '');
                                        setPrecioServicio(clean === '' ? '0' : parseInt(clean).toLocaleString('es-CL').replace(/,/g, '.'));
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                />
                            </View>
                        </View>

                        <PaymentMethodSelect
                            selectedMethod={metodoPago}
                            onSelect={setMetodoPago}
                        />

                        {/* Resumen de Precios */}
                        {anfitrionasSeleccionadas.length > 0 && (
                            <View style={[styles.summaryBox, { backgroundColor: cardBg, borderColor }]}>
                                <Text style={[styles.summaryTitle, { color: textPrimary }]}>RESUMEN</Text>

                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: textSecondary }]}>Servicio ({anfitrionasSeleccionadas.length} anfitriona{anfitrionasSeleccionadas.length > 1 ? 's' : ''})</Text>
                                    <Text style={[styles.summaryValue, { color: textPrimary }]}>
                                        ${((parseInt(precioServicio.replace(/\./g, '')) || 0) * anfitrionasSeleccionadas.length).toLocaleString('es-CL')}
                                    </Text>
                                </View>

                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: textSecondary }]}>Habitación ({anfitrionasSeleccionadas.length} anfitriona{anfitrionasSeleccionadas.length > 1 ? 's' : ''})</Text>
                                    <Text style={[styles.summaryValue, { color: textPrimary }]}>
                                        ${(precioHabitacionSinComision * anfitrionasSeleccionadas.length).toLocaleString('es-CL')}
                                    </Text>
                                </View>

                                {metodoPago === 'tarjeta' && (
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>IVA (20%)</Text>
                                        <Text style={[styles.summaryValue, { color: accentColor }]}>
                                            ${(() => {
                                                const totalServicio = (parseInt(precioServicio.replace(/\./g, '')) || 0) * anfitrionasSeleccionadas.length;
                                                return Math.floor(totalServicio * 0.20).toLocaleString('es-CL');
                                            })()}
                                        </Text>
                                    </View>
                                )}

                                <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />

                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryTotalLabel, { color: textPrimary }]}>TOTAL</Text>
                                    <Text style={[styles.summaryTotalValue, { color: accentColor }]}>
                                        ${(() => {
                                            const totalServicio = (parseInt(precioServicio.replace(/\./g, '')) || 0) * anfitrionasSeleccionadas.length;
                                            const totalHabitacion = precioHabitacionSinComision * anfitrionasSeleccionadas.length;
                                            let iva = 0;
                                            if (metodoPago === 'tarjeta') {
                                                iva = Math.floor(totalServicio * 0.20);
                                            }
                                            let total = totalServicio + totalHabitacion + iva;
                                            if (metodoPago === 'tarjeta') {
                                                total = Math.ceil(total / 5000) * 5000;
                                            }

                                            return total.toLocaleString('es-CL');
                                        })()}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.warningBox}>
                            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                            <Text style={styles.warningText}>
                                Al guardar, el servicio actual de {timer.roomName} se pausará automáticamente.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable
                            style={[styles.btn, styles.cancelBtn, { borderColor }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.btnText, { color: textSecondary }]}>CANCELAR</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.btn, styles.saveBtn, { backgroundColor: accentColor }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={[styles.btnText, { color: '#FFF' }]}>INICIAR SERVICIO</Text>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Modal de Selección de Anfitrionas */}
                <HostessSelectModal
                    visible={showHostessModal}
                    onClose={() => setShowHostessModal(false)}
                    onToggle={toggleAnfitriona}
                    hostesses={anfitrionasDisponibles.map(anf => ({
                        id: anf.id_usuario,
                        id_usuario: anf.id_usuario,
                        nick: anf.nick,
                        status: anf.status || 0
                    }))}
                    selectedIds={anfitrionasSeleccionadas.map(id => String(id))}
                    title="Seleccionar Anfitrionas"
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 163, 175, 0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
    },
    closeBtn: {
        padding: 5,
    },
    content: {
        padding: 20,
    },
    infoBox: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        borderRadius: 16,
    },
    infoLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 54,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '700',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    warningText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(156, 163, 175, 0.1)',
        gap: 12,
    },
    btn: {
        flex: 1,
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: {
        borderWidth: 1,
    },
    saveBtn: {
        elevation: 4,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    btnText: {
        fontSize: 14,
        fontWeight: '900',
    },
    summaryBox: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
        marginTop: 10,
    },
    summaryTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    summaryDivider: {
        height: 1,
        marginVertical: 12,
    },
    summaryTotalLabel: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    summaryTotalValue: {
        fontSize: 20,
        fontWeight: '900',
    },
});





