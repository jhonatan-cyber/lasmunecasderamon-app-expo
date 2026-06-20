import { useCallback, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { Timer } from '@/context/TimerContext';
import { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import { parseDateSafe } from '@/utils/timeUtils';
import logger from '@/utils/logger';

interface Anfitriona {
    id_usuario: number;
    nombre: string;
    apellido: string;
    nick: string;
    status?: number;
}

export default function useEditService(timer: Timer | null, onSuccess: () => void, onClose: () => void) {
    const [loading, setLoading] = useState(false);
    const [, setLoadingAnfitrionas] = useState(false);
    const [tiempo, setTiempo] = useState<number>(30);
    const [precioServicio, setPrecioServicio] = useState<string>('0');
    const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');
    const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<Anfitriona[]>([]);
    const [anfitrionasSeleccionadas, setAnfitrionasSeleccionadas] = useState<(string | number)[]>([]);
    const [showHostessModal, setShowHostessModal] = useState(false);
    const [precioHabitacionSinComision, setPrecioHabitacionSinComision] = useState<number>(0);

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

    const fetchHabitacionSinComision = useCallback(async () => {
        try {
            const res = await apiClient('/rooms');
            logger.info('[EditServiceModal] Respuesta habitaciones', { response: res });

            if (res.success && Array.isArray(res.data)) {
                res.data.forEach((h: any, index: number) => {
                    logger.info(`[EditServiceModal] Habitación ${index}:`, {
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
                    return comision === 0 && precio > 0 && tiempo > 0;
                });

                setPrecioHabitacionSinComision(habitacionSinComision
                    ? (habitacionSinComision.precio || habitacionSinComision.price || 0)
                    : 0);
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
                servicioRes.data.usuarios.forEach((anf: Anfitriona) => {
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
    }, [timer]);

    useEffect(() => {
        if (timer) {
            const timerId = setTimeout(() => {
                setPrecioServicio('0');
                setTiempo(30);
                setMetodoPago('efectivo');

                let ids: string[] = [];
                if (timer.anfitrionas_ids && Array.isArray(timer.anfitrionas_ids)) {
                    ids = timer.anfitrionas_ids.map(id => String(id));
                }
                setAnfitrionasSeleccionadas(ids);
                void fetchAnfitrionas();
                void fetchHabitacionSinComision();
            }, 0);

            return () => clearTimeout(timerId);
        }
    }, [timer, fetchAnfitrionas, fetchHabitacionSinComision]);

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

    const onPriceChange = (val: string) => {
        const clean = val.replace(/[^0-9]/g, '');
        setPrecioServicio(clean === '' ? '0' : parseInt(clean).toLocaleString('es-CL').replace(/,/g, '.'));
    };

    const isTarjeta = metodoPago === 'tarjeta';
    const numericPrecio = parseInt(precioServicio.replace(/\./g, '')) || 0;
    const numAnfs = anfitrionasSeleccionadas.length;
    const totalServicio = numericPrecio * numAnfs;
    const totalHabitacion = precioHabitacionSinComision * numAnfs;
    const iva = isTarjeta ? Math.floor(totalServicio * 0.20) : 0;
    let total = totalServicio + totalHabitacion + iva;
    if (isTarjeta) {
        total = Math.ceil(total / 5000) * 5000;
    }

    return {
        loading,
        tiempo, setTiempo,
        precioServicio,
        metodoPago, setMetodoPago,
        anfitrionasDisponibles,
        anfitrionasSeleccionadas,
        showHostessModal, setShowHostessModal,
        precioHabitacionSinComision,
        toggleAnfitriona,
        getSelectedHostessNames,
        handleSave,
        onPriceChange,
        numAnfs,
        totalServicio,
        totalHabitacion,
        iva,
        total,
        isTarjeta,
    };
}
