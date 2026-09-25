import { Ionicons } from '@expo/vector-icons';
import { View, Text, TextInput, Pressable, RefreshControl, StyleSheet } from 'react-native';
import FlashList from '@/components/shared/FlashList';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  MOTIVO_ENVASE,
  type EnvaseDevolucion,
  type EnvaseEscaneo,
  type EnvaseResultado,
} from '@/hooks/useEnvasesScreen';

interface ContainerReturnPanelProps {
  codigo: string;
  setCodigo: (v: string) => void;
  verificando: boolean;
  resultado: EnvaseResultado | null;
  sesion: EnvaseEscaneo[];
  entregados: number;
  rechazados: number;
  devoluciones: EnvaseDevolucion[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onEnviar: () => void;
  onLimpiarSesion: () => void;
  onRefresh: () => void;
  onAbrirScanner: () => void;
}

/** Fecha y hora compactas; el timestamp llega como ISO desde la API. */
const fechaHora = (valor: string | null): string => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return `${fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })} ${fecha.toLocaleTimeString(
    'es-CL',
    { hour: '2-digit', minute: '2-digit' },
  )}`;
};

/** Nombre visible de quien entregó o confirmó el envase. */
const nombreDe = (...campos: (string | null)[]): string => {
  const nombre = `${campos[0] || ''} ${campos[1] || ''}`.trim();
  return nombre || campos[2] || '—';
};

/** Rechazos que no son un error del operador y se muestran en ámbar. */
const MOTIVOS_AVISO = ['ya_devuelto'];

/**
 * Paso 1 del control de envases (bar → almacén): el barman escanea el envase
 * vacío antes de entregarlo y el sistema lo verifica y marca en el mismo paso.
 * Espejo del tab «Envases» de `/bar` del dashboard.
 */
export function ContainerReturnPanel({
  codigo,
  setCodigo,
  verificando,
  resultado,
  sesion,
  entregados,
  rechazados,
  devoluciones,
  loading,
  refreshing,
  error,
  onEnviar,
  onLimpiarSesion,
  onRefresh,
  onAbrirScanner,
}: ContainerReturnPanelProps) {
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();

  const enviar = () => {
    if (!verificando && codigo.trim()) onEnviar();
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
        <Ionicons name="scan-outline" size={16} color={accentColor} />
        <Text style={[styles.infoText, { color: textSecondary }]}>
          Escanea el envase vacío (EAN-13 o SKU LM-…) antes de entregarlo al almacén: se verifica que
          es nuestro, que está vacío y que no se entregó antes. La recepción la confirma el almacén
          desde el dashboard.
        </Text>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputWrap, { backgroundColor: cardBg, borderColor }]}>
          <TextInput
            value={codigo}
            onChangeText={setCodigo}
            placeholder="Escanea o digita el código"
            placeholderTextColor={textSecondary}
            style={[styles.input, { color: textPrimary }]}
            autoCapitalize="characters"
            autoCorrect={false}
            onSubmitEditing={enviar}
            returnKeyType="send"
          />
          <Pressable onPress={onAbrirScanner} style={[styles.iconBtn, { backgroundColor: `${accentColor}20` }]} accessibilityLabel="Abrir cámara">
            <Ionicons name="qr-code-outline" size={18} color={accentColor} />
          </Pressable>
        </View>
        <Pressable
          onPress={enviar}
          disabled={verificando || !codigo.trim()}
          style={[
            styles.submitBtn,
            { backgroundColor: accentColor, opacity: verificando || !codigo.trim() ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
          <Text style={styles.submitText}>{verificando ? 'Verificando…' : 'Entregar'}</Text>
        </Pressable>
      </View>

      {resultado && (
        <View
          style={[
            styles.resultCard,
            resultado.ok
              ? { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981' }
              : MOTIVOS_AVISO.includes(resultado.motivo ?? '')
                ? { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#F59E0B' }
                : { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: '#EF4444' },
          ]}
        >
          <Ionicons
            name={resultado.ok ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={resultado.ok ? '#10B981' : MOTIVOS_AVISO.includes(resultado.motivo ?? '') ? '#F59E0B' : '#EF4444'}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.resultTitle,
                { color: resultado.ok ? '#10B981' : MOTIVOS_AVISO.includes(resultado.motivo ?? '') ? '#F59E0B' : '#EF4444' },
              ]}
            >
              {resultado.ok ? 'Envase entregado al almacén' : MOTIVO_ENVASE[resultado.motivo ?? ''] || 'No es nuestro'}
            </Text>
            <Text style={[styles.resultMessage, { color: textSecondary }]}>{resultado.mensaje}</Text>
            {resultado.unidad && (
              <Text style={[styles.resultUnit, { color: textSecondary }]}>
                {resultado.unidad.producto_nombre || '—'} · {resultado.unidad.presentacion_nombre || '—'} · SKU{' '}
                {resultado.unidad.codigo}
              </Text>
            )}
          </View>
        </View>
      )}

      {sesion.length > 0 && (
        <View style={[styles.sessionRow, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sessionText, { color: textPrimary }]}>
            Sesión: <Text style={{ color: '#10B981' }}>{entregados} entregados</Text>
            {' · '}
            <Text style={{ color: '#EF4444' }}>{rechazados} rechazados</Text>
          </Text>
          <Pressable onPress={onLimpiarSesion} accessibilityLabel="Limpiar sesión de escaneos">
            <Text style={[styles.sessionClear, { color: accentColor }]}>Limpiar</Text>
          </Pressable>
        </View>
      )}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: textSecondary }]}>
        Devoluciones registradas ({devoluciones.length})
      </Text>

      {loading ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={90} borderRadius={16} />
          ))}
        </View>
      ) : (
        <FlashList
          data={devoluciones}
          keyExtractor={(item: EnvaseDevolucion) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Sin envases entregados todavía
              </Text>
            </View>
          }
          renderItem={({ item }: { item: EnvaseDevolucion }) => (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
                    {item.producto_nombre || '—'}
                  </Text>
                  <Text style={[styles.presentation, { color: textSecondary }]} numberOfLines={1}>
                    {item.presentacion_nombre || '—'} · SKU {item.codigo}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: item.pendiente_confirmacion
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(16,185,129,0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: item.pendiente_confirmacion ? '#F59E0B' : '#10B981' },
                    ]}
                  >
                    {item.pendiente_confirmacion ? 'Pendiente' : 'Recibido'}
                  </Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Ionicons name="person-outline" size={13} color={textSecondary} />
                <Text style={[styles.footerText, { color: textSecondary }]} numberOfLines={1}>
                  {nombreDe(item.usuario_nombre, item.usuario_apellido, item.usuario_nick)}
                </Text>
                <Text style={[styles.footerText, { color: textSecondary }]}>
                  {fechaHora(item.fecha_devolucion)}
                </Text>
              </View>

              {!item.pendiente_confirmacion && (
                <View style={styles.footer}>
                  <Ionicons name="checkmark-done-outline" size={13} color="#10B981" />
                  <Text style={[styles.footerText, { color: textSecondary }]} numberOfLines={1}>
                    Recibido por{' '}
                    {nombreDe(item.confirmado_nombre, item.confirmado_apellido, item.confirmado_nick)}
                    {item.fecha_confirmacion ? ` · ${fechaHora(item.fecha_confirmacion)}` : ''}
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '700', paddingVertical: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  resultCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultTitle: { fontSize: 13, fontWeight: '800' },
  resultMessage: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  resultUnit: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  sessionText: { fontSize: 12, fontWeight: '700' },
  sessionClear: { fontSize: 12, fontWeight: '800' },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
  },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 2,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productName: { fontSize: 15, fontWeight: '800' },
  presentation: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  footerText: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
