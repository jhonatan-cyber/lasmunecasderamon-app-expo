import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClientSafe } from '@/api/client-safe';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';
import { getUserRole, isAdminRole } from '@/utils/userRole';
import { showToast } from '@/utils/toast-lazy';

interface PendingContainer {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  compra_folio: string | null;
  fecha_devolucion: string | null;
  pendiente_confirmacion: boolean;
  usuario_nombre: string | null;
  usuario_nick: string | null;
}

interface BatchComparison {
  codigo: string | null;
  sku: string | null;
  existe: boolean;
  ok: boolean;
  mensaje: string;
  producto: string | null;
  presentacion: string | null;
}

const parseData = (value: unknown): Record<string, any> | null => {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === 'object' ? value as Record<string, any> : null;
};

export default function EnvasesPendientesScreen() {
  const router = useRouter();
  const { batchId } = useLocalSearchParams<{ batchId?: string }>();
  const user = useAuthStore((state) => state.user);
  const role = getUserRole(user);
  const allowed = isAdminRole(user) || role === 'cajero';
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [pendientes, setPendientes] = useState<PendingContainer[]>([]);
  const [comparacion, setComparacion] = useState<BatchComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    try {
      const [envases, notificaciones] = await Promise.all([
        apiClientSafe('/bar/containers') as Promise<any>,
        apiClientSafe('/notifications?type=history') as Promise<any>,
      ]);
      const filas = Array.isArray(envases?.data) ? envases.data as PendingContainer[] : [];
      setPendientes(filas.filter((fila) => fila.pendiente_confirmacion));
      const avisos = Array.isArray(notificaciones?.data) ? notificaciones.data : [];
      const lote = avisos
        .map((aviso: any) => parseData(aviso.datos))
        .find((datos: any) => datos?.batchId && (!batchId || datos.batchId === batchId));
      setComparacion(Array.isArray(lote?.resultados) ? lote.resultados : []);
    } catch (error) {
      showToast({ type: 'error', text1: 'No se pudieron cargar las devoluciones', text2: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [allowed, batchId]);

  useEffect(() => { void cargar(); }, [cargar]);

  const aceptar = async (item: PendingContainer) => {
    setConfirmando(item.id);
    try {
      const response = await apiClientSafe('/bar/containers/confirm', {
        method: 'POST',
        body: JSON.stringify({ codigo: item.codigo }),
      }) as any;
      if (response?.success === false || response?.data?.ok === false) {
        throw new Error(response?.message || response?.data?.mensaje || 'No se pudo aceptar la devolución');
      }
      showToast({ type: 'success', text1: 'Devolución aceptada', text2: item.producto_nombre || item.codigo });
      await cargar();
    } catch (error) {
      showToast({ type: 'error', text1: 'No se pudo aceptar', text2: error instanceof Error ? error.message : undefined });
    } finally {
      setConfirmando(null);
    }
  };

  if (!allowed) {
    return <View style={[styles.container, styles.center, { backgroundColor: bg }]}><Text style={{ color: textPrimary }}>Esta pantalla es para administración y caja.</Text></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader title="Devolución de envases" subtitle="Comparación y aprobación" rightComponent={
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color="#FFF" /><Text style={styles.backText}>Atrás</Text></Pressable>
      } />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={accentColor} />}
      >
        {comparacion.length > 0 && (
          <View style={[styles.panel, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>RESULTADO DE COMPARACIÓN DEL LOTE</Text>
            {comparacion.map((item, index) => (
              <View key={`${item.codigo}-${index}`} style={[styles.comparisonRow, { borderBottomColor: borderColor }]}>
                <Ionicons name={item.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={item.ok ? '#10B981' : '#EF4444'} />
                <View style={styles.rowText}>
                  <Text style={[styles.code, { color: textPrimary }]}>{item.codigo || item.sku || 'Código desconocido'}</Text>
                  <Text style={[styles.description, { color: textSecondary }]}>{item.existe ? `${item.producto || 'Producto'} · ${item.presentacion || 'Presentación'}` : 'No existe en nuestro inventario'} — {item.mensaje}</Text>
                </View>
                <Text style={[styles.status, { color: item.ok ? '#10B981' : '#EF4444' }]}>{item.ok ? 'VÁLIDO' : 'RECHAZADO'}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>PENDIENTES DE APROBACIÓN ({pendientes.length})</Text>
        {loading ? <ActivityIndicator color={accentColor} size="large" style={{ marginTop: 30 }} /> : pendientes.length === 0 ? (
          <View style={[styles.panel, { backgroundColor: cardBg, borderColor }]}><Text style={[styles.empty, { color: textSecondary }]}>No hay devoluciones pendientes.</Text></View>
        ) : pendientes.map((item) => (
          <View key={item.id} style={[styles.panel, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.pendingHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.product, { color: textPrimary }]}>{item.producto_nombre || 'Producto sin nombre'}</Text>
                <Text style={[styles.description, { color: textSecondary }]}>{item.presentacion_nombre || 'Presentación —'}</Text>
              </View>
              <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pendiente</Text></View>
            </View>
            <Text style={[styles.code, { color: textPrimary }]}>SKU {item.codigo}{item.codigo_barras ? ` · EAN ${item.codigo_barras}` : ''}</Text>
            <Text style={[styles.description, { color: textSecondary }]}>Entregado por {item.usuario_nombre || item.usuario_nick || '—'} · {item.fecha_devolucion ? new Date(item.fecha_devolucion).toLocaleString('es-BO') : '—'}</Text>
            {item.compra_folio && <Text style={[styles.description, { color: textSecondary }]}>Compra {item.compra_folio}</Text>}
            <Pressable onPress={() => void aceptar(item)} disabled={confirmando === item.id} style={({ pressed }) => [styles.accept, { backgroundColor: accentColor, opacity: pressed || confirmando === item.id ? 0.65 : 1 }]}>
              {confirmando === item.id ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#FFF" /><Text style={styles.acceptText}>Aceptar devolución</Text></>}
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  back: { height: 38, borderRadius: 9999, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)' },
  backText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.7, marginTop: 6 },
  panel: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 9 },
  comparisonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 3 },
  code: { fontSize: 12, fontWeight: '900' },
  description: { fontSize: 11, lineHeight: 16 },
  status: { fontSize: 9, fontWeight: '900' },
  empty: { textAlign: 'center', padding: 12, fontSize: 13, fontWeight: '600' },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  product: { fontSize: 15, fontWeight: '900' },
  pendingBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 9999, paddingHorizontal: 9, paddingVertical: 5 },
  pendingBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '900' },
  accept: { minHeight: 44, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 3 },
  acceptText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
