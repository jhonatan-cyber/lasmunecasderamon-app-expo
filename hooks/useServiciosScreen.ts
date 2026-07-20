import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { eventBus } from "@/utils/eventBus";
import { Colors } from "@/constants/theme";
import { showToast as showToastLazy } from '@/utils/toast-lazy';
import { useAccentColor } from "@/hooks/useAccentColor";
import { serviciosService } from "@/services";
import type { ApiRes } from "@/types/api";
import { useTimer } from "@/context/TimerContext";
import type { Timer } from '@/context/types';
import { parseDateSafe } from "@/utils/timeUtils";
import logger from "@/utils/logger";

export const safeNumber = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const normalized = val
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
    const fallback = parseFloat(val.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(fallback) ? fallback : 0;
  }
  const parsed = Number(val);
  if (Number.isFinite(parsed)) return parsed;
  return 0;
};

export const formatServiceDetail = (raw: any) => {
  const precioServicio = safeNumber(
    raw?.precio_servicio ?? raw?.precioServicio ?? 0,
  );
  const precioHabitacion = safeNumber(
    raw?.precio_habitacion ?? raw?.precioHabitacion ?? 0,
  );
  const iva = safeNumber(raw?.iva ?? 0);
  const anfitrionasIdsRaw = Array.isArray(raw?.anfitrionas_ids)
    ? raw.anfitrionas_ids
    : typeof raw?.anfitrionas_ids === "string"
      ? raw.anfitrionas_ids
          .split(",")
          .map((id: string) => id.trim())
          .filter(Boolean)
      : [];
  const anfitrionasNombres =
    typeof raw?.anfitrionas === "string"
      ? raw.anfitrionas
          .split(",")
          .map((name: string) => name.trim())
          .filter(Boolean)
      : [];
  const totalUsuarios = Math.max(
    1,
    safeNumber(raw?.total_usuarios ?? raw?.totalUsuarios ?? 0),
    anfitrionasIdsRaw.length,
    anfitrionasNombres.length,
  );

  const habitacionComision = safeNumber(raw?.habitacion_comision ?? 0);
  const tieneComisionHabitacion = habitacionComision > 0;

  const comisionIndividual = tieneComisionHabitacion
    ? Math.floor(habitacionComision / totalUsuarios)
    : precioServicio;
  const totalComision = tieneComisionHabitacion
    ? habitacionComision
    : precioServicio * totalUsuarios;

  const roomName =
    raw?.roomName ||
    raw?.habitacion_nombre ||
    raw?.habitacion_numero ||
    raw?.habitacion ||
    "Servicio de barra";
  const fechaServicio = parseDateSafe(
    raw?.fecha_crea || raw?.created_at || raw?.startTime,
  );

  return {
    ...raw,
    roomName,
    precio_servicio: precioServicio,
    precio_habitacion: precioHabitacion,
    iva,
    total: safeNumber(
      raw?.total ?? raw?.monto ?? precioServicio + precioHabitacion + iva,
    ),
    total_usuarios: totalUsuarios,
    habitacion_comision: habitacionComision,
    comision_individual: comisionIndividual,
    total_comision: totalComision,
    created_at: fechaServicio.toISOString(),
    fecha_crea: fechaServicio.toISOString(),
    waiter_name:
      raw?.waiter_name ||
      raw?.usuario_nick ||
      `${raw?.creator_nombre || ""} ${raw?.creator_apellido || ""}`.trim() ||
      "Admin",
    waiter_foto: raw?.waiter_foto || raw?.creator_foto,
    solicitante_name:
      raw?.solicitante_name || raw?.solicitante || "Servicio de barra",
    solicitante_foto: raw?.solicitante_foto || null,
  };
};

type ScreenState = {
  refreshing: boolean;
  activeTab: "activos" | "finalizados";
  finalizados: Timer[];
  loadingActivos: boolean;
  loadingFinalizados: boolean;
  editModalVisible: boolean;
  detailModalVisible: boolean;
  selectedTimer: Timer | null;
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
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_ACTIVE_TAB"; payload: "activos" | "finalizados" }
  | { type: "SET_FINALIZADOS"; payload: Timer[] }
  | { type: "SET_LOADING_ACTIVOS"; payload: boolean }
  | { type: "SET_LOADING_FINALIZADOS"; payload: boolean }
  | { type: "SET_EDIT_MODAL"; visible: boolean; timer?: Timer }
  | { type: "SET_DETAIL_MODAL"; visible: boolean; service?: any }
  | { type: "SET_ALERT"; payload: Partial<ScreenState["alertConfig"]> }
  | { type: "CLOSE_ALERT" };

const initialState: ScreenState = {
  refreshing: false,
  activeTab: "activos",
  finalizados: [],
  loadingActivos: false,
  loadingFinalizados: false,
  editModalVisible: false,
  detailModalVisible: false,
  selectedTimer: null,
  selectedServiceDetail: null,
  alertConfig: {
    visible: false,
    title: "",
    message: "",
    type: "info",
    showCancel: true,
  },
};

function reducer(state: ScreenState, action: Action): ScreenState {
  switch (action.type) {
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_FINALIZADOS":
      return { ...state, finalizados: action.payload };
    case "SET_LOADING_ACTIVOS":
      return { ...state, loadingActivos: action.payload };
    case "SET_LOADING_FINALIZADOS":
      return { ...state, loadingFinalizados: action.payload };
    case "SET_EDIT_MODAL":
      return {
        ...state,
        editModalVisible: action.visible,
        selectedTimer: action.timer || null,
      };
    case "SET_DETAIL_MODAL":
      return {
        ...state,
        detailModalVisible: action.visible,
        selectedServiceDetail: action.service || null,
      };
    case "SET_ALERT":
      return {
        ...state,
        alertConfig: { ...state.alertConfig, ...action.payload },
      };
    case "CLOSE_ALERT":
      return {
        ...state,
        alertConfig: { ...state.alertConfig, visible: false },
      };
    default:
      return state;
  }
}

export function useServiciosScreen() {
  const theme = useAccentColor();
  const { timers, refreshTimers, serverOffset } = useTimer();
  const isFocused = useRef(true);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { activeTab } = state;

  const fetchFinalizados = useCallback(async (isManual = false) => {
    dispatch({ type: "SET_LOADING_FINALIZADOS", payload: true });
    try {
      // OPTIMIZACIÓN: Single fetch con limit=1000 (antes paginación secuencial con while loop)
      const res = await serviciosService.list(1000, 1);
      const rawFinalizados = Array.isArray((res as any)?.data?.data)
        ? (res as any).data.data
        : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];

      if (Array.isArray(rawFinalizados)) {
        const mapped = rawFinalizados.map((sAny: any) => {
          const habitacionComision = safeNumber(sAny.habitacion_comision || 0);
          const comisionIndividual = safeNumber(sAny.comision_individual || 0);
          const totalUsuarios = Math.max(
            1,
            safeNumber(sAny.total_usuarios || 1),
          );
          const totalComision =
            habitacionComision > 0
              ? habitacionComision
              : comisionIndividual * totalUsuarios;

          return {
            id: String(sAny.id || sAny.id_servicio),
            servicioId: String(sAny.id || sAny.id_servicio),
            roomId: String(
              sAny.id_habitacion ||
                sAny.roomId ||
                sAny.habitacion_id ||
                "barra",
            ),
            roomName:
              sAny.habitacion_nombre ||
              sAny.habitacion_numero ||
              "Servicio de barra",
            duration: safeNumber(sAny.tiempo || 0),
            remainingTime: 0,
            isActive: false,
            isPaused: false,
            startTime: parseDateSafe(sAny.fecha_crea),
            servicioCode: sAny.codigo,
            clienteNombre: sAny.cliente_nombre,
            tipoTransaccion: "servicio" as const,
            anfitrionas: sAny.anfitrionas_nombres,
            anfitrionas_fotos: sAny.anfitrionas_fotos
              ? sAny.anfitrionas_fotos.split(",")
              : [],
            total: safeNumber(sAny.total || 0),
            monto: safeNumber(sAny.monto || 0),
            metodo_pago: sAny.metodo_pago,
            waiter_name:
              sAny.waiter_name ||
              `${sAny.creator_nombre || ""} ${sAny.creator_apellido || ""}`.trim() ||
              sAny.creator_nick,
            waiter_foto: sAny.waiter_foto || sAny.creator_foto,
            solicitante_name: sAny.solicitante_name,
            solicitante_foto: sAny.solicitante_foto,
            created_at: parseDateSafe(sAny.fecha_crea).toISOString(),
            fecha_crea: parseDateSafe(sAny.fecha_crea).toISOString(),
            estado: sAny.estado,
            pago_estado: sAny.pago_estado,
            anfitrionas_ids: sAny.anfitrionas_ids,
            comision_individual:
              habitacionComision > 0
                ? Math.floor(totalComision / totalUsuarios)
                : comisionIndividual,
            total_usuarios: totalUsuarios,
            total_comision: totalComision,
            habitacion_comision: habitacionComision,
            precio_habitacion: safeNumber(sAny.precio_habitacion || 0),
            precio_servicio: safeNumber(sAny.precio_servicio || 0),
            iva: safeNumber(sAny.iva || 0),
            sub_total: safeNumber(sAny.sub_total || 0),
          };
        });
        dispatch({ type: "SET_FINALIZADOS", payload: mapped });
        if (isManual) showToastLazy({ type: "success", text1: "Actualizado" });
      }
    } catch (error) {
      logger.captureException(error, { context: "Servicios:fetchData" });
    } finally {
      dispatch({ type: "SET_LOADING_FINALIZADOS", payload: false });
    }
  }, []);

  useEffect(() => {
    if (activeTab === "finalizados") fetchFinalizados();
  }, [activeTab, fetchFinalizados]);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      if (activeTab === "finalizados") {
        fetchFinalizados();
      } else {
        dispatch({ type: "SET_LOADING_ACTIVOS", payload: true });
        refreshTimers().finally(() =>
          dispatch({ type: "SET_LOADING_ACTIVOS", payload: false }),
        );
      }
      return () => {
        isFocused.current = false;
      };
    }, [activeTab, fetchFinalizados, refreshTimers]),
  );

  useEffect(() => {
    const sub = eventBus.addListener("refresh_sales", () => {
      refreshTimers();
      if (activeTab === "finalizados") fetchFinalizados();
    });
    return () => sub.remove();
  }, [refreshTimers, fetchFinalizados, activeTab]);

  const onRefresh = useCallback(async () => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    if (activeTab === "activos") await refreshTimers();
    else await fetchFinalizados(true);
    dispatch({ type: "SET_REFRESHING", payload: false });
  }, [activeTab, refreshTimers, fetchFinalizados]);

  const showToast = (
    title: string,
    message: string,
    type: "success" | "error" = "error",
  ) => {
    showToastLazy({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  };

  const onFinalizar = useCallback(
    (timer: Timer) => {
      dispatch({
        type: "SET_ALERT",
        payload: {
          visible: true,
          title: "Finalizar Servicio",
          message: "¿Seguro que deseas finalizar el servicio?",
          type: "danger",
          onConfirm: async () => {
            try {
              if (
                !timer.servicioId ||
                timer.servicioId === "NaN" ||
                timer.servicioId === "0"
              ) {
                showToast("Error", "ID de servicio inválido", "error");
                dispatch({ type: "CLOSE_ALERT" });
                return;
              }
              const res = await serviciosService.update(timer.servicioId, {
                estado: 1,
              });
              dispatch({ type: "CLOSE_ALERT" });
              if (res.success) {
                showToastLazy({ type: "success", text1: "Servicio Finalizado" });
                refreshTimers();
                fetchFinalizados();
              } else {
                showToastLazy({
                  type: "error",
                  text1: "Error",
                  text2: res.message,
                });
              }
            } catch (err: any) {
              dispatch({ type: "CLOSE_ALERT" });
              showToastLazy({
                type: "error",
                text1: "Error",
                text2: err.message || "Error al finalizar",
              });
            }
          },
        },
      });
    },
    [refreshTimers, fetchFinalizados],
  );

  const onEditar = useCallback((timer: Timer) => {
    dispatch({ type: "SET_EDIT_MODAL", visible: true, timer });
  }, []);

  const activeServicios = useMemo(() => {
    const servicios = timers.filter((t) => t.tipoTransaccion === "servicio");
    const temporalOriginalIds = new Set(
      servicios
        .filter((t) => t.es_temporal && t.servicio_original_id)
        .map((t) => String(t.servicio_original_id)),
    );
    return servicios.filter((t) => {
      if (t.es_temporal) return true;
      if (temporalOriginalIds.has(String(t.servicioId))) return false;
      return true;
    });
  }, [timers]);

  const { isDark, accentColor, bg, cardBg: themeCardBg, borderColor } = theme;
  const colors = Colors[isDark ? "dark" : "light"];
  const card = themeCardBg || colors.card;
  const text = colors.text;
  const textMuted = colors.textMuted;
  const border = borderColor;
  const accent = accentColor;
  const success = colors.success;
  const danger = colors.danger;
  const warning = colors.warning;
  const info = colors.info;

  return {
    ...theme,
    ...state,
    bg,
    card,
    text,
    textMuted,
    border,
    accent,
    success,
    danger,
    warning,
    info,
    serverOffset,
    activeServicios,
    fetchFinalizados,
    onRefresh,
    onFinalizar,
    onEditar,
    dispatch,
    refreshTimers,
  };
}
