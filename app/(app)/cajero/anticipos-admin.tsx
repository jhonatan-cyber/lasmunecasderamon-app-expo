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
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { anticiposService } from '@/services/anticipos';
import { formatCurrency } from '@/utils/format';
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

const ESTADOS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Anulado', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  1: { label: 'Aprobado', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  2: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  3: { label: 'Rechazado', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  4: { label: 'Liquidado', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
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

export default function AnticiposAdminScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } =
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

  const filtrados = useMemo(() => {
    const estado = (item: AnticipoAdmin) => Number(item.estado);
    if (filtro === 'todos') return data;
    if (filtro === 'pendientes') return data.filter(item => estado(item) === 2);
    if (filtro === 'aprobados') return data.filter(item => estado(item) === 1);
    if (filtro === 'rechazados') return data.filter(item => estado(item) === 3);
    return data.filter(item => estado(item) === 4);
  }, [data, filtro]);

  const pendientes = useMemo(
    () => data.filter(item => Number(item.estado) === 2).length,
    [data],
  );

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
    ({ item }: { item: AnticipoAdmin }) => {
      const estado = Number(item.estado);
      const config = ESTADOS[estado] || ESTADOS[2];
      const procesandoItem = procesando === String(item.id_anticipo);
      const entregado = estado === 1 && !!item.fecha_entrega;

      return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nombre, { color: textPrimary }]} numberOfLines={1}>
                {nombreDe(item)}
              </Text>
              <Text style={[styles.meta, { color: textSecondary }]}>
                {parseDateSafe(item.fecha_crea).toLocaleString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: config.bg }]}>
              <Text style={[styles.badgeText, { color: config.color }]}>
                {entregado ? 'Entregado' : config.label}
              </Text>
            </View>
          </View>

          <Text style={[styles.monto, { color: textPrimary }]}>
            {formatCurrency(Number(item.monto))}
          </Text>
          {item.motivo ? (
            <Text style={[styles.meta, { color: textSecondary }]}>{item.motivo}</Text>
          ) : null}
          {entregado ? (
            <Text style={[styles.meta, { color: textSecondary }]}>
              Entregó {item.entregado_por_nombre || 'cajero'}
              {item.fecha_entrega
                ? ` · ${parseDateSafe(item.fecha_entrega).toLocaleDateString('es-CL')}`
                : ''}
            </Text>
          ) : null}

          {estado === 2 ? (
            <View style={styles.actions}>
              <Pressable
                disabled={!!procesando}
                onPress={() => setConfirmar({ item, estado: 1 })}
                style={[
                  styles.actionBtn,
                  { backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.4)' },
                  procesandoItem && { opacity: 0.5 },
                ]}
              >
                {procesandoItem ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                )}
                <Text style={[styles.actionText, { color: '#10B981' }]}>Aprobar</Text>
              </Pressable>
              <Pressable
                disabled={!!procesando}
                onPress={() => setConfirmar({ item, estado: 3 })}
                style={[
                  styles.actionBtn,
                  { backgroundColor: 'rgba(239,68,68,0.14)', borderColor: 'rgba(239,68,68,0.4)' },
                  procesandoItem && { opacity: 0.5 },
                ]}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Rechazar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    },
    [borderColor, cardBg, procesando, textPrimary, textSecondary],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PremiumHeader title="Anticipos" subtitle="Solicitudes del personal" />
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader width="100%" height={130} borderRadius={20} />
          <SkeletonLoader width="100%" height={130} borderRadius={20} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Anticipos"
        subtitle={`${pendientes} pendientes · ${data.length} en total`}
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backText}>Atrás</Text>
          </Pressable>
        }
      />

      <View style={styles.filtros}>
        {FILTROS.map(opcion => (
          <Pressable
            key={opcion.id}
            onPress={() => setFiltro(opcion.id)}
            style={[
              styles.filtroChip,
              {
                backgroundColor: filtro === opcion.id ? accentColor : cardBg,
                borderColor: filtro === opcion.id ? accentColor : borderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.filtroText,
                { color: filtro === opcion.id ? '#FFFFFF' : textSecondary },
              ]}
            >
              {opcion.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={[styles.emptyText, { color: textSecondary }]}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              fetchData();
            }}
            style={[styles.retryBtn, { backgroundColor: accentColor }]}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={item => String(item.id_anticipo)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <Ionicons name="card-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No hay anticipos en este filtro
              </Text>
            </View>
          }
        />
      )}

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
  list: { padding: 16, paddingTop: 4, paddingBottom: 40, gap: 10 },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  filtroChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  filtroText: { fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nombre: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  monto: { fontSize: 20, fontWeight: '900', marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
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
  actionText: { fontSize: 13, fontWeight: '800' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', margin: 16 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
});
