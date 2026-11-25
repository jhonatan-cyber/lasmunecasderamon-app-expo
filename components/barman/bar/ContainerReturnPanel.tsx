import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { View, Text, TextInput, Pressable, RefreshControl, StyleSheet } from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
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
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, accentText, accentBg, accentBorder, surfaceMuted } = useAccentColor();

  const enviar = () => {
    if (!verificando && codigo.trim()) onEnviar();
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
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
          <Pressable onPress={onAbrirScanner} style={[styles.iconBtn, { backgroundColor: `${accentColor}20` }]} accessibilityRole="button" accessibilityLabel="Abrir cámara">
            <Ionicons name="qr-code-outline" size={18} color={accentOnSurface} />
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
          <Ionicons name="cube-outline" size={16} color={accentText} />
          <Text style={styles.submitText}>{verificando ? 'Verificando…' : 'Entregar'}</Text>
        </Pressable>
      </View>

      {resultado && (
        <View
          style={[
            styles.resultCard,
            resultado.ok
              ? { backgroundColor: accentBg, borderColor: accentOnSurface }
              : MOTIVOS_AVISO.includes(resultado.motivo ?? '')
                ? { backgroundColor: surfaceMuted, borderColor: accentOnSurface }
                : { backgroundColor: accentBg, borderColor: accentBorder },
          ]}
        >
          <Ionicons
            name={resultado.ok ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={accentOnSurface}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                styles.resultTitle,
                { color: accentOnSurface },
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
          <Text
            style={[styles.sessionText, { color: textPrimary, flexShrink: 1, minWidth: 0 }]}
            numberOfLines={1}
          >
            Sesión: <Text style={{ color: accentOnSurface }}>{entregados} entregados</Text>
            {' · '}
            <Text style={{ color: accentOnSurface }}>{rechazados} rechazados</Text>
          </Text>
          <Pressable onPress={onLimpiarSesion} accessibilityRole="button" accessibilityLabel="Limpiar sesión de escaneos">
            <Text style={[styles.sessionClear, { color: accentOnSurface, flexShrink: 0 }]}>Limpiar</Text>
          </Pressable>
        </View>
      )}

      {error ? (
        <ErrorState
          variant="inline"
          icon="warning-outline"
          title="Error de conexión"
          message={error}
          onRetry={onRefresh}
        />
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
        <VirtualizedList
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
                <View style={{ flex: 1, minWidth: 0 }}>
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
                      backgroundColor: surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: accentOnSurface },
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
                <Text
                  style={[styles.footerText, { color: textSecondary, flexShrink: 0 }]}
                  numberOfLines={1}
                >
                  {fechaHora(item.fecha_devolucion)}
                </Text>
              </View>

              {(item.ml_merma ?? 0) > 0 && (
                <Text style={[styles.footerText, { color: accentOnSurface, marginTop: 5 }]}>
                  Merma registrada: {item.ml_merma} ml
                </Text>
              )}

              {!item.pendiente_confirmacion && (
                <View style={styles.footer}>
                  <Ionicons name="checkmark-done-outline" size={13} color={accentOnSurface} />
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
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  input: { flex: 1, fontSize: 14, fontFamily: FontFamily.bold, paddingVertical: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  submitText: { fontFamily: FontFamily.extrabold, fontSize: 13 },
  resultCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  resultTitle: { flexShrink: 1, fontSize: 13, fontFamily: FontFamily.extrabold },
  resultMessage: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  resultUnit: { fontSize: 11, marginTop: 4, fontFamily: FontFamily.semibold },
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
  sessionText: { fontSize: 12, fontFamily: FontFamily.bold },
  sessionClear: { fontSize: 12, fontFamily: FontFamily.extrabold },
  sectionTitle: {
    fontSize: 10,
    fontFamily: FontFamily.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 2,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productName: { fontSize: 15, fontFamily: FontFamily.extrabold },
  presentation: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontFamily: FontFamily.extrabold, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  footerText: { fontSize: 11, fontFamily: FontFamily.semibold, flexShrink: 1, minWidth: 0 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: FontFamily.semibold },
});
