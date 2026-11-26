import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AdvanceCard } from '@/components/ui/AdvanceCard';
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { EmptyState } from '@/components/ui/EmptyState';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { LIST_PERF_PROPS } from '@/constants/listPerf';
import { BorderRadius } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';
import { tabBarBottomPadding } from '@/constants/layout';
import { anticiposService } from '@/services/anticipos';
import { formatCurrency } from '@/utils/format';
import { FontFamily } from '@/constants/fonts';
import { parseDateSafe } from '@/utils/timeUtils';
import { showToast } from '@/utils/toast-lazy';

interface AnticipoAdmin {
  id_anticipo: number | string;
  usuario_id: number | string;
  name?: string;
  nombre?: string;
  lastName?: string;
  apellido?: string;
  nick?: string;
  fecha_crea: string;
  fecha_aprobacion?: string | null;
  fecha_cobro?: string | null;
  monto: number | string;
  motivo?: string | null;
  estado: number | string;
  entregado_por_nombre?: string | null;
  fecha_entrega?: string | null;
}

type Filtro = 'pendientes' | 'aprobados' | 'rechazados' | 'liquidados' | 'todos';

const ESTADO_LABEL: Record<number, string> = {
  0: 'Anulado',
  1: 'Aprobado',
  2: 'Pendiente',
  3: 'Rechazado',
  4: 'Liquidado',
};

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'aprobados', label: 'Aprobados' },
  { id: 'rechazados', label: 'Rechazados' },
  { id: 'liquidados', label: 'Liquidados' },
  { id: 'todos', label: 'Todos' },
];

const nombreDe = (item: AnticipoAdmin) =>
  [item.nombre || item.name, item.apellido || item.lastName].filter(Boolean).join(' ').trim() ||
  item.nick ||
  'Sin nombre';

const normalizeEstado = (estado: number | string) => {
  switch (Number(estado)) {
    case 2:
      return 'pendiente';
    case 1:
      return 'confirmada';
    case 3:
    case 0:
      return 'rechazada';
    case 4:
      return 'liquidada';
    default:
      return String(estado ?? '');
  }
};

export default function AnticiposAdminScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textSecondary, borderColor, accentOnSurface, accentBg, accentBorder, surfaceMuted } =
    useAccentColor();
  const [data, setData] = useState<AnticipoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [confirmar, setConfirmar] = useState<{
    item: AnticipoAdmin;
    estado: 1 | 3;
  } | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError('');
      const res = (await anticiposService.list()) as {
        success: boolean;
        message?: string;
        data?: AnticipoAdmin[] | { data?: AnticipoAdmin[] };
      };
      if (signal?.aborted) return;
      if (!res.success) throw new Error(res.message || 'No se pudieron cargar los anticipos');
      const filas = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setData(filas);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Error de conexión');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchData(ac.signal);
      return () => ac.abort();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    const base: Record<Filtro, number> = {
      pendientes: 0,
      aprobados: 0,
      rechazados: 0,
      liquidados: 0,
      todos: data.length,
    };
    for (const item of data) {
      const estado = Number(item.estado);
      if (estado === 2) base.pendientes += 1;
      else if (estado === 1) base.aprobados += 1;
      else if (estado === 3) base.rechazados += 1;
      else if (estado === 4) base.liquidados += 1;
    }
    return base;
  }, [data]);

  const totalPendiente = useMemo(
    () =>
      data
        .filter(item => Number(item.estado) === 2)
        .reduce((sum, item) => sum + (Number(item.monto) || 0), 0),
    [data],
  );

  const totalGeneral = useMemo(
    () => data.reduce((sum, item) => sum + (Number(item.monto) || 0), 0),
    [data],
  );

  const filtrados = useMemo(() => {
    const estado = (item: AnticipoAdmin) => Number(item.estado);
    if (filtro === 'todos') return data;
    if (filtro === 'pendientes') return data.filter(item => estado(item) === 2);
    if (filtro === 'aprobados') return data.filter(item => estado(item) === 1);
    if (filtro === 'rechazados') return data.filter(item => estado(item) === 3);
    return data.filter(item => estado(item) === 4);
  }, [data, filtro]);

  const procesar = useCallback(
    async (item: AnticipoAdmin, estado: 1 | 3) => {
      setProcesando(String(item.id_anticipo));
      try {
        const res = await anticiposService.update(item.id_anticipo, { estado });
        if (!res.success) {
          showToast({ type: 'error', text1: 'No se pudo procesar', text2: res.message });
          return;
        }
        showToast({
          type: 'success',
          text1: estado === 1 ? 'Anticipo aprobado' : 'Anticipo rechazado',
          text2: `${nombreDe(item)} · ${formatCurrency(Number(item.monto))}`,
        });
        await fetchData();
      } catch (err: any) {
        showToast({
          type: 'error',
          text1: 'No se pudo procesar',
          text2: err?.message || 'Error de conexión',
        });
      } finally {
        setProcesando(null);
        setConfirmar(null);
      }
    },
    [fetchData],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AnticipoAdmin; index: number }) => {
      const estado = Number(item.estado);
      const procesandoItem = procesando === String(item.id_anticipo);
      const entregado = estado === 1 && !!item.fecha_entrega;

      const footer =
        estado === 2 ? (
          <View style={styles.actions}>
            <Pressable
              disabled={!!procesando}
              onPress={() => setConfirmar({ item, estado: 1 })}
              style={[
                styles.actionBtn,
                { backgroundColor: accentBg, borderColor: accentBorder },
                procesandoItem && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Aprobar anticipo"
              accessibilityState={{ disabled: !!procesando }}
            >
              {procesandoItem ? (
                <ActivityIndicator size="small" color={accentOnSurface} />
              ) : (
                <Ionicons name="checkmark" size={16} color={accentOnSurface} />
              )}
              <Text style={[styles.actionText, { color: accentOnSurface }]}>Aprobar</Text>
            </Pressable>
            <Pressable
              disabled={!!procesando}
              onPress={() => setConfirmar({ item, estado: 3 })}
              style={[
                styles.actionBtn,
                { backgroundColor: surfaceMuted, borderColor: accentBorder },
                procesandoItem && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Rechazar anticipo"
              accessibilityState={{ disabled: !!procesando }}
            >
              <Ionicons name="close" size={16} color={accentOnSurface} />
              <Text style={[styles.actionText, { color: accentOnSurface }]}>Rechazar</Text>
            </Pressable>
          </View>
        ) : entregado ? (
          <Text style={[styles.entregado, { color: textSecondary }]}>
            Entregó {item.entregado_por_nombre || 'cajero'}
            {item.fecha_entrega
              ? ` · ${parseDateSafe(item.fecha_entrega).toLocaleDateString('es-CL')}`
              : ''}
          </Text>
        ) : undefined;

      return (
        <AdvanceCard
          item={{
            id_solicitud: item.id_anticipo,
            usuario_id: item.usuario_id,
            fecha_crea: item.fecha_crea,
            fecha_mod: null,
            monto: Number(item.monto) || 0,
            estado,
            estado_texto: ESTADO_LABEL[estado] || '',
            motivo: item.motivo || undefined,
          }}
          index={index}
          showIndexBadge={false}
          compactDate
          normalizeEstado={normalizeEstado}
          title={nombreDe(item)}
          statusLabel={entregado ? 'Entregado' : ESTADO_LABEL[estado]}
          footer={footer}
        />
      );
    },
    [procesando, textSecondary, accentBg, accentBorder, accentOnSurface, surfaceMuted],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PremiumHeader title="Anticipos" subtitle="Solicitudes del personal" />
        <View style={{ margin: 16 }}>
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3].map(i => (
            <View
              key={i}
              style={{
                padding: 16,
                borderRadius: BorderRadius.card,
                borderWidth: 1,
                borderColor,
                backgroundColor: cardBg,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 15,
                }}
              >
                <SkeletonLoader width={80} height={20} borderRadius={10} />
                <SkeletonLoader width={60} height={20} borderRadius={10} />
              </View>
              <SkeletonLoader height={15} width="60%" style={{ marginBottom: 15 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <SkeletonLoader width={80} height={30} />
                <SkeletonLoader width={80} height={30} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PremiumHeader
          title="Anticipos"
          subtitle="Solicitudes del personal"
          onBack={() => router.back()}
        />
        <EmployeeListError
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchData();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Anticipos"
        subtitle={`${counts.pendientes} pendientes · ${data.length} en total`}
        onBack={() => router.back()}
      />

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: cardBg,
            borderColor,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
          },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          ANTICIPOS PENDIENTES
        </Text>
        <Text style={[styles.summaryAmount, { color: accentOnSurface }]}>
          ${totalPendiente.toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Total: ${totalGeneral.toLocaleString()}
          </Text>
          <View
            style={{
              width: 1,
              height: 12,
              backgroundColor: borderColor,
              alignSelf: 'center',
            }}
          />
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Items: {data.length}
          </Text>
        </View>
      </View>

      <FilterTabs
        tabs={FILTROS.map(opcion => ({
          key: opcion.id,
          label: opcion.label,
          count: counts[opcion.id],
        }))}
        activeKey={filtro}
        onTabPress={setFiltro}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <FlatList
        data={filtrados}
        keyExtractor={item => String(item.id_anticipo)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        ListEmptyComponent={
          <EmptyState icon="card-outline" title="No se encontraron anticipos" />
        }
        {...LIST_PERF_PROPS}
      />

      <PremiumAlert
        visible={!!confirmar}
        title={confirmar?.estado === 1 ? 'Aprobar anticipo' : 'Rechazar anticipo'}
        message={
          confirmar
            ? `${confirmar.estado === 1 ? '¿Aprobar' : '¿Rechazar'} el anticipo de ${formatCurrency(
                Number(confirmar.item.monto),
              )} de ${nombreDe(confirmar.item)}?`
            : ''
        }
        type={confirmar?.estado === 1 ? 'info' : 'danger'}
        showCancel
        confirmText={confirmar?.estado === 1 ? 'Aprobar' : 'Rechazar'}
        onConfirm={() => {
          if (confirmar) void procesar(confirmar.item, confirmar.estado);
        }}
        onCancel={() => setConfirmar(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: FontFamily.black,
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 38,
    fontFamily: FontFamily.black,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  summaryDetails: { flexDirection: 'row', gap: 16 },
  summaryDetail: { fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: tabBarBottomPadding },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: { fontSize: 13, fontFamily: FontFamily.extrabold },
  entregado: { fontSize: 13 },
});
