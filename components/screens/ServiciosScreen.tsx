import VirtualizedList from "@/components/shared/VirtualizedList";
import { contentColumn } from "@/constants/layout";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useStableCallback } from "@/hooks/useStableCallback";
import { eventBus } from "@/utils/eventBus";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { showToast as showToastLazy } from '@/utils/toast-lazy';
import { servicioATimer, serviciosService } from '@/services/servicios';
import {
  calcularComisionServicio,
  contarUsuariosServicio,
} from '@/utils/servicioTotales';
import { EmptyState } from '@/components/ui/EmptyState';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTimer } from '@/context/TimerContext';
import type { Timer } from '@/context/types';
import { parseDateSafe } from '@/utils/timeUtils';
import { Colors } from '@/constants/theme';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { BarmanOfflineBanner } from '@/components/barman/BarmanOfflineBanner';
import { OfflineStatusBanner } from '@/components/offline/OfflineStatusBanner';
import { blockOffline } from '@/utils/offlineGuard';
import { safeNumber } from '@/utils/format';
import logger from '@/utils/logger';
import { BorderRadius } from '@/constants/spacing';

import {
  ServiceCard,
  ServiciosModales
} from '@/components/cajero/servicios';
import type { DetailAction } from '@/components/cajero/servicios/ServiceDetailModal';

const listaDeTexto = (valor: unknown): string[] =>
  Array.isArray(valor)
    ? valor.map((item) => String(item).trim()).filter(Boolean)
    : typeof valor === "string"
      ? valor.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

const formatServiceDetail = (raw: any, useServerTotals: boolean) => {
  const precioServicio = safeNumber(raw?.precio_servicio ?? raw?.precioServicio ?? 0);
  const precioHabitacion = safeNumber(raw?.precio_habitacion ?? raw?.precioHabitacion ?? 0);
  const iva = safeNumber(raw?.iva ?? 0);
  const anfitrionasIds = listaDeTexto(raw?.anfitrionas_ids);
  const anfitrionasNombres = listaDeTexto(raw?.anfitrionas);
  const totalUsuarios = contarUsuariosServicio({
    totalUsuarios: raw?.total_usuarios ?? raw?.totalUsuarios,
    anfitrionasIds,
    anfitrionasNombres,
  });

  const habitacionComision = safeNumber(raw?.habitacion_comision ?? 0);
  const comision = calcularComisionServicio({
    habitacionComision,
    precioServicioUnidad: precioServicio,
    totalUsuarios,
  });

  const comisionIndividual = useServerTotals && raw?.comision_individual != null
    ? safeNumber(raw.comision_individual)
    : comision.comisionIndividual;
  const totalComision = useServerTotals && raw?.total_comision != null
    ? safeNumber(raw.total_comision)
    : comision.totalComision;

  const roomName = raw?.roomName || raw?.habitacion_nombre || raw?.habitacion_numero || raw?.habitacion || "Servicio de barra";
  const fechaServicio = parseDateSafe(raw?.fecha_crea || raw?.created_at || raw?.startTime);

  return {
    ...raw,
    roomName,
    precio_servicio: precioServicio,
    precio_habitacion: precioHabitacion,
    iva,
    total: safeNumber(raw?.total ?? raw?.monto ?? (precioServicio + precioHabitacion + iva)),
    total_usuarios: useServerTotals && raw?.total_usuarios != null ? safeNumber(raw.total_usuarios) : totalUsuarios,
    habitacion_comision: habitacionComision,
    comision_individual: comisionIndividual,
    total_comision: totalComision,
    created_at: fechaServicio.toISOString(),
    fecha_crea: fechaServicio.toISOString(),
    waiter_name: raw?.waiter_name || raw?.usuario_nick || `${raw?.creator_nombre || ""} ${raw?.creator_apellido || ""}`.trim() || "Admin",
    waiter_foto: raw?.waiter_foto || raw?.creator_foto,
    solicitante_name: raw?.solicitante_name || raw?.solicitante || "Servicio de barra",
    solicitante_foto: raw?.solicitante_foto || null,
  };
};

const SERVICIOS_POR_PAGINA = 100;

/** Minúsculas y sin acentos para que "habitacion" encuentre "Habitación". */
const normalizarBusqueda = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

type ScreenState = {
  refreshing: boolean;
  activeTab: 'activos' | 'finalizados';
  finalizados: Timer[];
  finalizadosPage: number;
  hasMoreFinalizados: boolean;
  busquedaFinalizados: string;
  loadingActivos: boolean;
  loadingFinalizados: boolean;
  loadingMoreFinalizados: boolean;
  editModalVisible: boolean;
  detailModalVisible: boolean;
  selectedTimer: Timer | null;
  detailTimer: Timer | null;
  selectedServiceDetail: any | null;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    confirmText?: string;
  };
};

type Action =
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'activos' | 'finalizados' }
  | { type: 'SET_FINALIZADOS_PAGE'; payload: { items: Timer[]; page: number; hasMore: boolean } }
  | { type: 'SET_BUSQUEDA_FINALIZADOS'; payload: string }
  | { type: 'SET_LOADING_ACTIVOS'; payload: boolean }
  | { type: 'SET_LOADING_FINALIZADOS'; payload: boolean }
  | { type: 'SET_LOADING_MORE_FINALIZADOS'; payload: boolean }
  | { type: 'SET_EDIT_MODAL'; visible: boolean; timer?: Timer }
  | { type: 'SET_DETAIL_MODAL'; visible: boolean; service?: any; timer?: Timer }
  | { type: 'SET_ALERT'; payload: Partial<ScreenState['alertConfig']> }
  | { type: 'CLOSE_ALERT' };

const initialState: ScreenState = {
  refreshing: false,
  activeTab: 'activos',
  finalizados: [],
  finalizadosPage: 0,
  hasMoreFinalizados: true,
  busquedaFinalizados: "",
  loadingActivos: false,
  loadingFinalizados: false,
  loadingMoreFinalizados: false,
  editModalVisible: false,
  detailModalVisible: false,
  selectedTimer: null,
  detailTimer: null,
  selectedServiceDetail: null,
  alertConfig: { visible: false, title: "", message: "", type: "info", showCancel: true },
};

function reducer(state: ScreenState, action: Action): ScreenState {
  switch (action.type) {
    case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
    case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
    case 'SET_FINALIZADOS_PAGE': {
      const { items, page, hasMore } = action.payload;
      const base = page > 1 ? state.finalizados : [];
      const vistos = new Set(base.map((timer) => timer.id));
      const nuevos = items.filter((timer) => !vistos.has(timer.id));
      return {
        ...state,
        finalizados: [...base, ...nuevos],
        finalizadosPage: page,
        hasMoreFinalizados: hasMore,
      };
    }
    case 'SET_BUSQUEDA_FINALIZADOS': return { ...state, busquedaFinalizados: action.payload };
    case 'SET_LOADING_ACTIVOS': return { ...state, loadingActivos: action.payload };
    case 'SET_LOADING_FINALIZADOS': return { ...state, loadingFinalizados: action.payload };
    case 'SET_LOADING_MORE_FINALIZADOS': return { ...state, loadingMoreFinalizados: action.payload };
    case 'SET_EDIT_MODAL': return { ...state, editModalVisible: action.visible, selectedTimer: action.timer || null };
    case 'SET_DETAIL_MODAL': return {
      ...state,
      detailModalVisible: action.visible,
      selectedServiceDetail: action.visible ? action.service || null : null,
      detailTimer: action.visible ? action.timer || null : null,
    };
    case 'SET_ALERT': return { ...state, alertConfig: { ...state.alertConfig, ...action.payload } };
    case 'CLOSE_ALERT': return { ...state, alertConfig: { ...state.alertConfig, visible: false } };
    default: return state;
  }
}

type ServiciosVariant = 'cajero' | 'barman' | 'admin';

interface CapacidadesServicios {
  /** Sin editar/finalizar: solo consulta (admin). */
  soloLectura: boolean;
  /** Oculta el panel de asistencia y acciones del barman. */
  sinAccionesBarman: boolean;
  muestraFinalizados: boolean;
  muestraFAB: boolean;
  rutaAtras: '/cajero' | '/(app)/barman/(tabs)';
}

const CAPACIDADES: Record<ServiciosVariant, CapacidadesServicios> = {
  cajero: {
    soloLectura: false,
    sinAccionesBarman: false,
    muestraFinalizados: true,
    muestraFAB: true,
    rutaAtras: '/cajero',
  },
  barman: {
    soloLectura: false,
    sinAccionesBarman: true,
    muestraFinalizados: false,
    muestraFAB: true,
    rutaAtras: '/(app)/barman/(tabs)',
  },
  admin: {
    soloLectura: true,
    sinAccionesBarman: false,
    muestraFinalizados: true,
    muestraFAB: false,
    rutaAtras: '/cajero',
  },
};

interface ServiciosScreenProps {
  variant: ServiciosVariant;
}

export function ServiciosScreen({ variant }: ServiciosScreenProps) {
  const esCajero = variant === 'cajero';
  const esAdmin = variant === 'admin';
  const capacidades = CAPACIDADES[variant];
  const { soloLectura, sinAccionesBarman } = capacidades;
  const { accentColor, accentText, isDark } = useAccentColor();
  const router = useRouter();
  const { isTablet } = useResponsiveMetrics();
  const numColumns = isTablet ? 2 : 1;
  const { timers, refreshTimers, serverOffset } = useTimer();
  const isFocused = useRef(true);

  const [state, dispatch] = useReducer(reducer, initialState);
  const [assignmentTimer, setAssignmentTimer] = useState<Timer | null>(null);
  const {
    refreshing,
    activeTab,
    finalizados,
    finalizadosPage,
    hasMoreFinalizados,
    busquedaFinalizados,
    loadingActivos,
    loadingFinalizados,
    loadingMoreFinalizados,
    editModalVisible,
    selectedTimer,
    alertConfig,
    selectedServiceDetail,
    detailTimer,
    detailModalVisible,
  } = state;

  const colors = Colors[isDark ? 'dark' : 'light'];
  const cardBg = colors.card;
  const textPrimary = colors.text;
  const textSecondary = colors.textMuted;
  const borderColor = isDark ? `${accentColor}40` : colors.border;
  const theme = useMemo(() => ({
    bg: isDark ? "#000000" : "#F8FAFC",
    card: cardBg,
    text: textPrimary,
    textMuted: textSecondary,
    border: borderColor,
    accent: accentColor,
    accentText,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    info: colors.info,
    isDark,
  }), [isDark, accentColor, accentText, cardBg, textPrimary, textSecondary, borderColor, colors.danger, colors.info, colors.success, colors.warning]);

  const tabsList = useMemo(() => {
    const base: { key: 'activos' | 'finalizados'; label: string; icon: any }[] = [
      { key: 'activos', label: 'Activos', icon: 'timer-outline' },
    ];
    if (capacidades.muestraFinalizados) {
      base.push({ key: 'finalizados', label: 'Finalizados', icon: 'checkmark-circle-outline' });
    }
    return base;
  }, [capacidades.muestraFinalizados]);

  const activeServicios = useMemo(() => {
    const servicios = timers.filter(t => t.tipoTransaccion === 'servicio');
    
    const temporalOriginalIds = new Set(
      servicios
        .filter(t => t.es_temporal && t.servicio_original_id)
        .map(t => String(t.servicio_original_id))
    );
    return servicios.filter(t => {
      if (t.es_temporal) return true;
      if (temporalOriginalIds.has(String(t.servicioId))) return false;
      return true;
    });
  }, [timers]);

  const finalizadosVisibles = useMemo(() => {
    const q = normalizarBusqueda(busquedaFinalizados);
    if (!q) return finalizados;
    return finalizados.filter((timer) =>
      [timer.roomName, timer.servicioCode, timer.anfitrionas, timer.clienteNombre]
        .some((valor) => normalizarBusqueda(String(valor ?? "")).includes(q)),
    );
  }, [finalizados, busquedaFinalizados]);

  const cargarPaginaFinalizados = useCallback(
    async (page: number, isManual = false) => {
      const primera = page <= 1;
      dispatch({
        type: primera ? 'SET_LOADING_FINALIZADOS' : 'SET_LOADING_MORE_FINALIZADOS',
        payload: true,
      });
      try {
        const res = await serviciosService.listar({
          all: true,
          limit: SERVICIOS_POR_PAGINA,
          page,
        });
        if (!res.success) {
          if (isManual) {
            showToastLazy({ type: "error", text1: "Error", text2: res.message });
          }
          return;
        }

        dispatch({
          type: 'SET_FINALIZADOS_PAGE',
          payload: {
            items: res.items.map(servicioATimer),
            page,
            hasMore: page * SERVICIOS_POR_PAGINA < res.total,
          },
        });
        if (isManual) showToastLazy({ type: "success", text1: "Actualizado" });
      } catch (error) {
        logger.captureException(error, { context: 'Servicios:fetchData' });
      } finally {
        dispatch({ type: 'SET_LOADING_FINALIZADOS', payload: false });
        dispatch({ type: 'SET_LOADING_MORE_FINALIZADOS', payload: false });
      }
    },
    [],
  );

  const fetchFinalizados = useCallback(
    (isManual = false) => cargarPaginaFinalizados(1, isManual),
    [cargarPaginaFinalizados],
  );

  const cargarMasFinalizados = useCallback(() => {
    if (!hasMoreFinalizados || loadingFinalizados || loadingMoreFinalizados) return;
    void cargarPaginaFinalizados(finalizadosPage + 1);
  }, [
    hasMoreFinalizados,
    loadingFinalizados,
    loadingMoreFinalizados,
    finalizadosPage,
    cargarPaginaFinalizados,
  ]);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      if (activeTab === "finalizados") {
        fetchFinalizados();
      } else {
        dispatch({ type: 'SET_LOADING_ACTIVOS', payload: true });
        refreshTimers().finally(() => dispatch({ type: 'SET_LOADING_ACTIVOS', payload: false }));
      }
      return () => {
        isFocused.current = false;
      };
    }, [activeTab, fetchFinalizados, refreshTimers])
  );

  useEffect(() => {
    const sub = eventBus.addListener("refresh_sales", () => {
      // Fuera de foco la pantalla no se ve: refrescar acá solo gasta red.
      if (!isFocused.current) return;
      refreshTimers();
      if (activeTab === "finalizados") fetchFinalizados();
    });
    return () => sub.remove();
  }, [refreshTimers, fetchFinalizados, activeTab]);

  const onRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    if (activeTab === "activos") await refreshTimers();
    else await fetchFinalizados(true);
    dispatch({ type: 'SET_REFRESHING', payload: false });
  }, [activeTab, refreshTimers, fetchFinalizados]);

  const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    showToastLazy({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000
    });
  };

  const onFinalizar = useCallback((timer: Timer) => {
    // Finalizar factura el servicio en el servidor: sin red no se puede.
    if (!blockOffline('temporizador')) return;
    dispatch({
      type: 'SET_ALERT', payload: {
        visible: true,
        title: "Finalizar Servicio",
        message: "¿Seguro que deseas finalizar el servicio?",
        type: "danger",
        onConfirm: async () => {
          try {
            if (!timer.servicioId || timer.servicioId === 'NaN' || timer.servicioId === '0') {
              showToast("Error", "ID de servicio inválido", "error");
              dispatch({ type: 'CLOSE_ALERT' });
              return;
            }
            const res = await serviciosService.actualizarEstado(timer.servicioId, 1);
            dispatch({ type: 'CLOSE_ALERT' });
            if (res.success) {
              showToastLazy({ type: "success", text1: "Servicio Finalizado" });
              refreshTimers();
              fetchFinalizados();
            } else {
              showToastLazy({ type: "error", text1: "Error", text2: res.message });
            }
          } catch (err: any) {
            dispatch({ type: 'CLOSE_ALERT' });
            showToastLazy({ type: "error", text1: "Error", text2: err.message || "Error al finalizar" });
          }
        }
      }
    });
  }, [refreshTimers, fetchFinalizados]);

  const onEditar = useCallback((timer: Timer) => {
    if (!blockOffline('servicio')) return;
    dispatch({ type: 'SET_EDIT_MODAL', visible: true, timer });
  }, []);

  const closeDetail = useCallback(() => {
    dispatch({ type: 'SET_DETAIL_MODAL', visible: false });
  }, []);

  const onAgregarVenta = useCallback((timer: Timer) => {
    router.push({
      pathname: '/cajero/nueva-venta',
      params: { servicio_id: timer.servicioId },
    } as never);
  }, [router]);

  const onCambiarAnfitrionas = useCallback((timer: Timer) => {
    if (!blockOffline('servicio')) return;
    setAssignmentTimer(timer);
  }, []);

  const detalleGestionable =
    !soloLectura &&
    !sinAccionesBarman &&
    detailTimer != null &&
    [2, 3].includes(Number(detailTimer.estado));

  const detailAcciones = useMemo<DetailAction[]>(() => {
    if (!detailTimer || !detalleGestionable) return [];
    const acciones: DetailAction[] = [];
    if (esCajero) {
      acciones.push({
        key: 'venta',
        label: 'Agregar venta',
        icon: 'cart-outline',
        onPress: () => {
          closeDetail();
          onAgregarVenta(detailTimer);
        },
      });
    }
    acciones.push({
      key: 'anfitrionas',
      label: 'Cambiar o liberar anfitrionas',
      icon: 'people-outline',
      onPress: () => {
        closeDetail();
        onCambiarAnfitrionas(detailTimer);
      },
    });
    if (
      !detailTimer.es_temporal &&
      !detailTimer.servicio_original_id &&
      Number(detailTimer.habitacion_comision || 0) > 0
    ) {
      acciones.push({
        key: 'adicional',
        label: 'Servicio adicional',
        icon: 'create-outline',
        onPress: () => {
          closeDetail();
          onEditar(detailTimer);
        },
      });
    }
    return acciones;
  }, [
    detailTimer,
    detalleGestionable,
    esCajero,
    closeDetail,
    onAgregarVenta,
    onCambiarAnfitrionas,
    onEditar,
  ]);

  const onFinalizarDetail =
    detalleGestionable && detailTimer
      ? () => {
        closeDetail();
        onFinalizar(detailTimer);
      }
      : undefined;

  const renderItem = useStableCallback(({ item }: { item: any }) => (
    <ServiceCard
      item={item}
      activeTab={activeTab}
      serverOffset={serverOffset}
      onFinalizar={sinAccionesBarman ? undefined : onFinalizar}
      onEditar={sinAccionesBarman ? undefined : onEditar}
      onAgregarVenta={sinAccionesBarman ? undefined : onAgregarVenta}
      onCambiarAnfitrionas={sinAccionesBarman ? undefined : onCambiarAnfitrionas}
      readOnly={soloLectura}
      sinAccionesBarman={sinAccionesBarman}
      onPress={(t) => dispatch({
        type: 'SET_DETAIL_MODAL',
        visible: true,
        timer: t,
        service: formatServiceDetail(t, esCajero || esAdmin),
      })}
      theme={theme}
    />
  ));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Servicios"
        onBack={() => router.replace(capacidades.rutaAtras)}
      />
      <Tabs
        tabs={tabsList}
        activeKey={activeTab}
        onChange={(tabId) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId })}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
        variant="pills"
      />

      {esCajero ? (
        <OfflineStatusBanner pendientesHref={'/(app)/cajero/pendientes' as never} />
      ) : sinAccionesBarman ? (
        <BarmanOfflineBanner />
      ) : null}

      <View style={{ flex: 1 }}>
        {activeTab === "finalizados" && (
          <SearchBar
            value={busquedaFinalizados}
            onChangeText={(text) =>
              dispatch({ type: 'SET_BUSQUEDA_FINALIZADOS', payload: text })
            }
            placeholder="Habitación, código, anfitriona"
            style={styles.searchContainer}
          />
        )}
        <VirtualizedList
          data={activeTab === "activos" ? activeServicios : finalizadosVisibles}
          renderItem={renderItem}
          keyExtractor={(item: any) => String(item.id ?? item.servicioId)}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />
          }
          windowSize={10}
          maxToRenderPerBatch={7}
          initialNumToRender={5}
          removeClippedSubviews={true}
          onEndReached={activeTab === "finalizados" ? cargarMasFinalizados : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            activeTab === "finalizados" && loadingMoreFinalizados ? (
              <ActivityIndicator color={accentColor} style={{ paddingVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            loadingActivos || loadingFinalizados ? (
              <View style={{ padding: 16, gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={96} borderRadius={BorderRadius.card} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="documents-outline"
                title="No hay servicios que mostrar"
                message={
                  activeTab === "finalizados" && busquedaFinalizados.trim()
                    ? "Ningún servicio coincide con la búsqueda."
                    : "No se encontraron servicios con el filtro actual. Intenta cambiar el tipo de servicio."
                }
              />
            )
          }
        />
      </View>

      {capacidades.muestraFAB && (
        <PremiumFAB
          icon="add"
          accessibilityLabel={esCajero ? 'Nuevo servicio' : 'Solicitar servicio'}
          onPress={() =>
            router.push(
              (esCajero ? '/cajero/nuevo-servicio' : '/barman/solicitar-servicio') as never,
            )
          }
          visible={!editModalVisible && !detailModalVisible && !alertConfig.visible}
        />
      )}

      <ServiciosModales
        editModalVisible={editModalVisible}
        selectedTimer={selectedTimer}
        onCloseEdit={() => dispatch({ type: 'SET_EDIT_MODAL', visible: false })}
        onSuccessEdit={() => {
          refreshTimers();
          fetchFinalizados();
        }}
        alertConfig={alertConfig}
        onCloseAlert={() => dispatch({ type: 'CLOSE_ALERT' })}
        detailModalVisible={detailModalVisible}
        selectedServiceDetail={selectedServiceDetail}
        detailAcciones={detailAcciones}
        onFinalizarDetail={onFinalizarDetail}
        serverOffset={serverOffset}
        onCloseDetail={closeDetail}
        assignmentTimer={assignmentTimer}
        onCloseAssignment={() => setAssignmentTimer(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { ...contentColumn, padding: 12, paddingBottom: 100 },
  searchContainer: {
    marginHorizontal: 12,
    marginTop: 8,
  },
});
