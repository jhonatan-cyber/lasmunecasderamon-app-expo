import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { apiClientSafe } from '@/api/client';
import { ServiceCreateSchema } from '@lasmunecasderamon/validations';
import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import { parseDateSafe } from '@/utils/timeUtils';
import logger from '@/utils/logger';
import {
  type ServicePayload,
} from '@/components/cajero/nuevo-servicio/types';
import { generateCode } from '@/components/cajero/nuevo-servicio/helpers';
import { showToast, normalizeRoom, normalizeAnfitrionas, normalizeClients, deduplicate, getCardSplit, getIvaDecimal } from '@/hooks/utils/cartUtils';
import { serviceReducer, initialServiceState } from '@/components/cajero/nuevo-servicio/reducer';

export function useNuevoServicio() {
  const router = useRouter();
  const [state, dispatch] = useReducer(serviceReducer, initialServiceState);

  const {
    loadingInitial,
    anfitrionas,
    habitaciones,
    clientes,
    cajaAbierta,
    selectedHostesses,
    selectedClients,
    selectedHabitacion,
    precioServicio,
    metodoPago,
    metodoPagoAdicional,
    pagosMixtos,
    submitting,
    hostessModalVisible,
    roomModalVisible,
    clientModalVisible,
    balanceModalVisible,
    balanceAmount,
    balanceSubmitting,
  } = state;

  const hasAnfitrionaComision =
    selectedHabitacion && (selectedHabitacion.comision_anfitriona ?? 0) > 0;

  const maxHostesses = hasAnfitrionaComision
    ? Math.min(3, 4 - selectedClients.length)
    : 10;
  const maxClients = hasAnfitrionaComision ? 4 - selectedHostesses.length : 4;

  const numericPrecioServicio = parseInt(precioServicio.replace(/\./g, '')) || 0;

  const totals = useMemo(() => {
    const numAnfitrionas = selectedHostesses.length || 1;
    const numClientes = selectedClients.length || 1;

    const multiplicadorTiempo = selectedHabitacion?.tiempo === 60 ? 2 : 1;
    const multiplicadorServicio = numAnfitrionas;
    const tieneComision = (selectedHabitacion?.comision_anfitriona ?? 0) > 0;
    const multiplicadorHabitacion = tieneComision
      ? 1
      : Math.max(numAnfitrionas, numClientes);

    const precioServicioActual =
      numericPrecioServicio * multiplicadorTiempo * multiplicadorServicio;
    const precioHabitacionActual =
      (selectedHabitacion?.precio || 0) * multiplicadorTiempo * multiplicadorHabitacion;

    let calculatedIva = 0;
    if (metodoPago === 'tarjeta') {
      calculatedIva = Math.floor(precioServicioActual * getIvaDecimal());
    }

    let currentTotal = precioServicioActual + precioHabitacionActual + calculatedIva;

    if (metodoPago === 'tarjeta') {
      const totalRedondeado = Math.ceil(currentTotal / 5000) * 5000;
      const excedente = totalRedondeado - currentTotal;
      currentTotal = totalRedondeado;
      calculatedIva += excedente;
    }

    return {
      subTotal: precioServicioActual,
      iva: calculatedIva,
      total: currentTotal,
      precioHabitacionActual,
      precioServicioActual,
      comisionPorAnfitriona:
        tieneComision && selectedHostesses.length > 0
          ? Math.floor(selectedHabitacion.comision_anfitriona / selectedHostesses.length)
          : selectedHabitacion?.comision_anfitriona || 0,
    };
  }, [
    numericPrecioServicio,
    selectedHostesses.length,
    selectedClients.length,
    selectedHabitacion,
    metodoPago,
  ]);

  const desgloseTarjeta = useMemo(() => getCardSplit(totals.total), [totals.total]);

  const selectedClientData = useMemo(() => {
    if (selectedClients.length === 0) return null;
    return clientes.find(
      (c) => String(c.id_cliente || c.id) === String(selectedClients[0]),
    );
  }, [selectedClients, clientes]);

  const fetchInitialData = useCallback(async (signal?: AbortSignal) => {
    dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
    try {
      const [cajaRes, anfitrionasRes, roomsRes, clientsRes] = await Promise.all([
        apiClientSafe('/cashregister/status', { signal }),
        apiClientSafe('/anfitrionas', { signal }),
        apiClientSafe('/rooms', { signal }),
        apiClientSafe('/clients', { signal }),
      ]);

      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          cajaAbierta: (cajaRes as any).success && (cajaRes as any).data?.hasOpenCaja,
          anfitrionas: deduplicate(normalizeAnfitrionas(anfitrionasRes), 'id_usuario'),
          habitaciones: deduplicate(((roomsRes as any).success ? (roomsRes as any).data : []).map((room: any) => ({
            ...normalizeRoom(room),
            status: room.status ?? room.estado ?? 0,
            price: room.price ?? room.precio ?? 0,
            time: room.time ?? room.tiempo ?? 0,
          })), 'id_habitacion'),
          clientes: deduplicate(normalizeClients(clientsRes), 'id_cliente'),
        },
      });

      if (!(cajaRes as any).success || !(cajaRes as any).data?.hasOpenCaja) {
        showToast('Caja Cerrada', 'Debes abrir una caja antes de crear servicios.', 'error');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NuevoServicio:fetchInitialData' });
      showToast('Error', 'No se pudo cargar la información necesaria.');
    } finally {
      dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchInitialData(ac.signal);
    return () => ac.abort();
  }, [fetchInitialData]);

  const toggleHostess = useCallback(
    (hostessId: string | number) => {
      const isSelected = selectedHostesses.some((id) => String(id) === String(hostessId));
      let next: (string | number)[];

      if (isSelected) {
        next = selectedHostesses.filter((id) => String(id) !== String(hostessId));
      } else {
        if (selectedHostesses.length >= maxHostesses) {
          showToast('Límite', `Máximo ${maxHostesses} anfitrionas`);
          return;
        }
        next = [...selectedHostesses, hostessId];
      }

      const uniqueNext = Array.from(new Set(next.map((id) => String(id)))).map((idStr) =>
        next.find((id) => String(id) === idStr),
      );

      dispatch({ type: 'SET_SELECTED_HOSTESSES', payload: uniqueNext.map((id) => Number(id)) });
    },
    [selectedHostesses, maxHostesses],
  );

  const toggleClient = useCallback(
    (clientId: string | number) => {
      const isSelected = selectedClients.some((id) => String(id) === String(clientId));
      let next: (string | number)[];

      if (isSelected) {
        next = selectedClients.filter((id) => String(id) !== String(clientId));
      } else {
        if (selectedClients.length >= maxClients) {
          showToast('Límite', `Máximo ${maxHostesses} anfitrionas`);
          return;
        }
        next = [...selectedClients, clientId];
      }

      const uniqueNext = Array.from(new Set(next.map((id) => String(id)))).map((idStr) =>
        next.find((id) => String(id) === idStr),
      );

      dispatch({ type: 'SET_SELECTED_CLIENTS', payload: uniqueNext as (string | number)[] });

      if (uniqueNext.length === 0) {
        dispatch({ type: 'SET_METODO_PAGO', payload: 'efectivo' });
      }
    },
    [selectedClients, maxClients, maxHostesses],
  );

  const handleLoadBalance = useCallback(async () => {
    const clientId = selectedClients.length > 0 ? selectedClients[0] : null;
    if (!clientId || !balanceAmount) return;

    dispatch({ type: 'SET_BALANCE_SUBMITTING', payload: true });
    try {
      const amount = parseInt(balanceAmount.replace(/\./g, ''));
      const res = await apiClientSafe('/clients/prepago', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: clientId,
          monto: amount,
          tipo: 'CARGA',
        }),
      });

      if ((res as any).success) {
        showToast('Éxito', 'Saldo cargado correctamente', 'success');
        dispatch({ type: 'UPDATE_CLIENT_SALDO', payload: { id: clientId, saldo: (res as any).data.nuevo_saldo } });
        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'balance', visible: false });
        dispatch({ type: 'SET_BALANCE_AMOUNT', payload: '' });
      } else {
        showToast('Error', (res as any).message || 'No se pudo cargar el saldo');
      }
    } catch {
      showToast('Error', 'Error al procesar la carga de saldo');
    } finally {
      dispatch({ type: 'SET_BALANCE_SUBMITTING', payload: false });
    }
  }, [selectedClients, balanceAmount]);

  const handleSubmit = useCallback(async () => {
    if (!cajaAbierta) {
      showToast('Caja Cerrada', 'Abre una caja primero.');
      return;
    }

    const esMixto = metodoPago === 'mixto' || metodoPagoAdicional === 'mixto';
    if (esMixto) {
      const sumaPagos = pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
      if (Math.abs(sumaPagos - totals.total) > 1) {
        showToast(
          'Monto Incorrecto',
          `La suma de los pagos ($${sumaPagos.toLocaleString()}) debe ser igual al total ($${totals.total.toLocaleString()})`,
          'error',
        );
        return;
      }
      if (pagosMixtos.length < 2) {
        showToast('Métodos Insuficientes', 'Selecciona al menos 2 métodos de pago para el método mixto', 'error');
        return;
      }
    }

    if (metodoPago === 'prepago' || (metodoPago === 'mixto' && pagosMixtos.some((p) => p.metodo === 'prepago'))) {
      const saldo = Number(selectedClientData?.saldo || 0);
      if (metodoPago === 'mixto') {
        const prepagoMonto = pagosMixtos.find((p) => p.metodo === 'prepago')?.monto || 0;
        if (prepagoMonto > saldo) {
          showToast('Saldo Insuficiente', 'El monto de prepago no puede exceder el saldo del cliente', 'error');
          return;
        }
      } else if (saldo < totals.total && !metodoPagoAdicional) {
        showToast('Saldo Insuficiente', 'El saldo del cliente no cubre el total. Selecciona un método adicional.', 'error');
        return;
      }
    }

    if (!selectedHabitacion) {
      showToast('Falta Datos', 'Selecciona una habitación.');
      return;
    }
    if (selectedHostesses.length === 0) {
      showToast('Falta Datos', 'Selecciona al menos una anfitriona.');
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      const payload: ServicePayload = {
        codigo: generateCode(),
        cliente_id: selectedClients.length > 0 ? String(selectedClients[0]) : null,
        clientes: selectedClients.map((id) => String(id)),
        habitacion_id: String(selectedHabitacion.id_habitacion || selectedHabitacion.id),
        precio_habitacion: totals.precioHabitacionActual,
        precio_servicio: numericPrecioServicio,
        iva: totals.iva,
        sub_total: hasAnfitrionaComision ? totals.precioHabitacionActual : totals.subTotal,
        total: totals.total,
        tiempo: selectedHabitacion.tiempo || 0,
        fecha_crea: parseDateSafe(new Date()).toISOString(),
        metodo_pago: metodoPago,
        usuarios: selectedHostesses.map((id) => String(id)),
      };

      if (esMixto) {
        payload.pagos_mixtos = pagosMixtos;
        const prepagoMonto = pagosMixtos.find((p) => p.metodo === 'prepago')?.monto || 0;
        if (prepagoMonto > 0 && metodoPago !== 'mixto') {
          payload.metodo_pago = 'prepago';
          payload.monto_prepago = prepagoMonto;
        }
      } else if (metodoPago === 'prepago' && Number(selectedClientData?.saldo || 0) < totals.total) {
        payload.metodo_pago_adicional = metodoPagoAdicional || undefined;
      }

      const validation = ServiceCreateSchema.safeParse(payload);
      if (!validation.success) {
        const msg = validation.error.issues[0]?.message || 'Datos del servicio inválidos';
        showToast('Error de Validación', msg);
        dispatch({ type: 'SET_SUBMITTING', payload: false });
        return;
      }

      const res = await apiClientSafe('/servicios', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if ((res as any).success) {
        showToast('Éxito', 'Servicio creado correctamente', 'success');
        setTimeout(() => router.replace('/cajero/servicios'), 1500);
      } else {
        showToast('Error', (res as any).message || 'No se pudo crear el servicio');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NuevoServicio:submit' });
      showToast('Error', 'Ocurrió un error al procesar el servicio.');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [
    cajaAbierta,
    selectedHabitacion,
    selectedHostesses,
    selectedClients,
    totals,
    numericPrecioServicio,
    metodoPago,
    metodoPagoAdicional,
    pagosMixtos,
    selectedClientData,
    hasAnfitrionaComision,
    router,
  ]);

  
  useEffect(() => {
    const selectedClient =
      selectedClients.length === 0
        ? null
        : clientes.find((c) => String(c.id_cliente || c.id) === String(selectedClients[0]));
    if (!selectedClient) return;
    const saldo = Number(selectedClient.saldo || 0);
    if (saldo >= totals.total && totals.total > 0) {
      dispatch({ type: 'SET_METODO_PAGO', payload: 'prepago' });
    } else if (saldo > 0 && saldo < totals.total) {
      dispatch({ type: 'SET_METODO_PAGO', payload: 'mixto' });
      dispatch({
        type: 'SET_PAGOS_MIXTOS',
        payload: [
          {
            metodo: 'prepago' as PaymentMethod,
            monto: saldo,
            display: saldo > 0 ? saldo.toLocaleString('es-CL') : '',
          },
        ],
      });
    }
  }, [clientes, selectedClients, totals.total]);

  const handleMetodoPagoChange = useCallback(
    (val: PaymentMethod) => {
      dispatch({ type: 'SET_METODO_PAGO', payload: val });
      if (val !== 'prepago') {
        dispatch({ type: 'SET_METODO_PAGO_ADICIONAL', payload: '' });
        dispatch({ type: 'SET_PAGOS_MIXTOS', payload: [] });
      }
      if (val === 'mixto') {
        const saldo = Number(selectedClientData?.saldo || 0);
        dispatch({
          type: 'SET_PAGOS_MIXTOS',
          payload:
            saldo > 0
              ? [
                  {
                    metodo: 'prepago' as PaymentMethod,
                    monto: saldo,
                    display: saldo.toLocaleString('es-CL'),
                  },
                ]
              : [],
        });
      }
    },
    [selectedClientData],
  );

  return {
    state,
    dispatch,
    
    hasAnfitrionaComision,
    maxHostesses,
    maxClients,
    numericPrecioServicio,
    totals,
    desgloseTarjeta,
    selectedClientData,
    
    toggleHostess,
    toggleClient,
    handleLoadBalance,
    handleSubmit,
    handleMetodoPagoChange,
  };
}
