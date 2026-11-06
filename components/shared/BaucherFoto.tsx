import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  cargarImagenBaucher,
  BaucherNoDisponibleError,
} from '@/utils/baucherImagen';

interface BaucherFotoProps {
  /** Ruta autenticada que sirve la foto, por ejemplo `/sales/<id>/baucher`. */
  endpoint: string;
  /** Texto del visor: cliente, código o fecha de la operación. */
  descripcion?: string;
  /** Versión reducida para listados (entradas, tarjetas). */
  compacto?: boolean;
}

/**
 * Foto del baucher de un pago con transferencia.
 *
 * El dashboard guarda el archivo y en la fila sólo queda el nombre, por eso acá
 * no hay lógica de negocio: un botón que abre la foto completa. La imagen se
 * pide recién al abrir el visor —las listas no descargan todas las fotos— y la
 * ruta exige sesión, así que se carga con el token de la app.
 */
export function BaucherFoto({ endpoint, descripcion, compacto = false }: BaucherFotoProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [visible, setVisible] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** La foto se pide recién al abrir el visor, no al montar cada fila. */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUri(await cargarImagenBaucher(endpoint));
    } catch (err: unknown) {
      setError(
        err instanceof BaucherNoDisponibleError
          ? 'El baucher ya no está disponible en el servidor.'
          : 'No se pudo cargar el baucher. Revisa la conexión e intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const reintentar = useCallback(() => {
    setUri(null);
    void cargar();
  }, [cargar]);

  const abrir = useCallback(() => {
    setVisible(true);
    if (!uri) void cargar();
  }, [cargar, uri]);

  const cerrar = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <Pressable
        onPress={abrir}
        style={[
          compacto ? styles.chipCompacto : styles.chip,
          { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}14` },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ver foto del baucher"
      >
        <Ionicons name="document-attach-outline" size={compacto ? 12 : 14} color={accentColor} />
        <Text
          style={[compacto ? styles.chipTextoCompacto : styles.chipTexto, { color: accentColor }]}
        >
          Baucher
        </Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} />
          <View style={[styles.visor, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.visorHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.visorTitulo, { color: textPrimary }]}>
                  Baucher de la transferencia
                </Text>
                {!!descripcion && (
                  <Text style={[styles.visorDescripcion, { color: textSecondary }]}>
                    {descripcion}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={cerrar}
                style={[styles.cerrar, { borderColor }]}
                accessibilityRole="button"
                accessibilityLabel="Cerrar baucher"
              >
                <Ionicons name="close" size={20} color={textPrimary} />
              </Pressable>
            </View>

            <View style={[styles.imagenMarco, { borderColor }]}>
              {loading || (!uri && !error) ? (
                <ActivityIndicator size="large" color={accentColor} />
              ) : uri ? (
                <Image source={{ uri }} style={styles.imagen} resizeMode="contain" />
              ) : (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={28} color={textSecondary} />
                  <Text style={[styles.errorTexto, { color: textSecondary }]}>{error}</Text>
                  <Pressable
                    onPress={reintentar}
                    style={[styles.reintentar, { backgroundColor: accentColor }]}
                  >
                    <Text style={styles.reintentarTexto}>REINTENTAR</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipCompacto: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTexto: { fontSize: 12, fontWeight: '800' },
  chipTextoCompacto: { fontSize: 10, fontWeight: '800' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  visor: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  visorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  visorTitulo: { fontSize: 16, fontWeight: '900' },
  visorDescripcion: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenMarco: {
    flexShrink: 1,
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 8,
  },
  imagen: { width: '100%', height: 320 },
  errorBox: { alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 24 },
  errorTexto: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  reintentar: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, marginTop: 4 },
  reintentarTexto: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
});
