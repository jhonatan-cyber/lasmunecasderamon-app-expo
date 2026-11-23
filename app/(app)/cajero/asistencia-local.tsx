import Ionicons from '@expo/vector-icons/Ionicons';
import { contentColumn } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ErrorState } from '@/components/ui/ErrorState';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { attendanceService } from '@/services/attendance';

interface AsistenciaHoy {
  id_asistencia: number | string;
  fecha: string;
  hora: string;
  id_usuario: number | string;
  nick?: string;
  nombre_completo?: string;
  rol?: string;
}

const horaCorta = (hora: string) => String(hora ?? '').slice(0, 5);

export default function AsistenciaLocalScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor, accentOnSurface} =
    useAccentColor();
  const [data, setData] = useState<AsistenciaHoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError('');
      const res = await attendanceService.hoy(signal);
      if (signal?.aborted) return;
      if (!res.success) throw new Error(res.message || 'No se pudo cargar la asistencia');
      setData(Array.isArray(res.data) ? (res.data as AsistenciaHoy[]) : []);
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

  const personas = useMemo(
    () => new Set(data.map(item => String(item.id_usuario))).size,
    [data],
  );

  const renderItem = useCallback(
    ({ item }: { item: AsistenciaHoy }) => {
      const nombre = item.nombre_completo || item.nick || 'Sin nombre';
      const inicial = nombre.trim().charAt(0).toUpperCase();
      return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.avatar, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[styles.avatarText, { color: accentOnSurface }]}>{inicial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: textPrimary }]} numberOfLines={1}>
              {nombre}
            </Text>
            <Text style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
              {[item.nick ? `@${item.nick}` : null, item.rol].filter(Boolean).join(' · ') ||
                'Sin rol'}
            </Text>
          </View>
          <View style={[styles.timePill, { backgroundColor: surfaceMuted }]}>
            <Ionicons name="time-outline" size={13} color={textSecondary} />
            <Text style={[styles.timeText, { color: textPrimary }]}>{horaCorta(item.hora)}</Text>
          </View>
        </View>
      );
    },
    [accentColor, accentOnSurface, borderColor, cardBg, surfaceMuted, textPrimary, textSecondary],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PremiumHeader title="Asistencia en el local" subtitle="Marcas de hoy" />
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader width="100%" height={76} borderRadius={18} />
          <SkeletonLoader width="100%" height={76} borderRadius={18} />
          <SkeletonLoader width="100%" height={76} borderRadius={18} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Asistencia en el local"
        subtitle={`${data.length} marcas · ${personas} personas`}
        onBack={() => router.back()}
      />

      {error ? (
        <ErrorState
          title="No se pudo cargar la asistencia"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchData();
          }}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => String(item.id_asistencia)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <Ionicons name="people-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Todavía no hay marcas de asistencia hoy
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { ...contentColumn, padding: 16, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontFamily: FontFamily.black },
  name: { fontSize: 14, fontFamily: FontFamily.extrabold },
  meta: { fontSize: 12, marginTop: 2 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  timeText: { fontSize: 12, fontFamily: FontFamily.extrabold },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backText: { fontFamily: FontFamily.extrabold, fontSize: 13, letterSpacing: 0.5 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', margin: 16 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
