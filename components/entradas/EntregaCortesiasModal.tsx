import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import { styles } from './EntregaCortesiasModal.styles';
import { EntregaCortesiasProducto } from './entrega-cortesias/EntregaCortesiasProducto';
import { claveDe, precioVisible } from './entrega-cortesias/helpers';
import type { EntregaCortesiasModalProps } from './entrega-cortesias/types';
import { useEntregaCortesias } from './entrega-cortesias/useEntregaCortesias';

export type { GrupoEntrega } from './entrega-cortesias/types';
export function EntregaCortesiasModal({
  visible,
  grupo,
  tope,
  onClose,
  onEntregado,
  modo = 'entrega',
}: EntregaCortesiasModalProps) {
  const { accentColor, textPrimary, textSecondary, borderColor, isDark } = useAccentColor();
  const {
    acompanamientos,
    busqueda,
    setBusqueda,
    cargando,
    error,
    entregando,
    filas,
    umbral,
    seleccion,
    visibles,
    totalSeleccionado,
    lineas,
    faltanAcompanamientos,
    agregar,
    quitar,
    agregarSabor,
    ajustarSabor,
    quitarSabor,
    cambiarAdicional,
    cerrar,
    entregar,
  } = useEntregaCortesias({ visible, grupo, tope, onClose, onEntregado, modo });

  const fondo = isDark ? '#111827' : '#FFFFFF';
  const submitDeshabilitado =
    entregando || cargando || lineas.length === 0 || faltanAcompanamientos;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.backdrop}>
          <View
            style={[styles.card, { backgroundColor: fondo, borderColor, maxHeight: '92%' }]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                    ENTREGAR CORTESÍAS
                  </Text>
                  <Text
                    style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}
                    numberOfLines={1}
                  >
                    {grupo?.cliente || 'Cliente sin nombre'}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 12 }}>
                    {filas.length} {filas.length === 1 ? 'entrada pendiente' : 'entradas pendientes'}{' '}
                    · {formatCurrency(filas.reduce((suma, fila) => suma + fila.monto_entrada, 0))}
                  </Text>
                </View>
                <Pressable onPress={cerrar} hitSlop={10}>
                  <Ionicons name="close" size={22} color={textSecondary} />
                </Pressable>
              </View>

              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar producto"
                placeholderTextColor={textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                    borderColor,
                    color: textPrimary,
                  },
                ]}
              />

              {cargando ? (
                <View style={{ paddingVertical: 24 }}>
                  <ActivityIndicator color={accentColor} />
                </View>
              ) : error ? (
                <Text style={{ color: '#EF4444', fontSize: 12, paddingVertical: 16 }}>{error}</Text>
              ) : (
                <>
                  {visibles.length === 0 && (
                    <Text
                      style={{
                        color: textSecondary,
                        fontSize: 12,
                        textAlign: 'center',
                        paddingVertical: 16,
                      }}
                    >
                      Sin cortes hasta {formatCurrency(umbral)} con stock en el bar.
                    </Text>
                  )}
                  {visibles.map(({ bebida, formato }) => {
                    const clave = claveDe(bebida, formato);
                    return (
                      <EntregaCortesiasProducto
                        key={clave}
                        bebida={bebida}
                        formato={formato}
                        linea={seleccion[clave]}
                        precio={precioVisible(bebida, formato)}
                        limiteAlcanzado={totalSeleccionado >= filas.length}
                        acompanamientos={acompanamientos}
                        onAgregar={() => agregar(bebida, formato)}
                        onQuitar={() => quitar(clave)}
                        onAgregarSabor={opcion => agregarSabor(clave, opcion)}
                        onAjustarSabor={(presentacionId, delta) =>
                          ajustarSabor(clave, presentacionId, delta)
                        }
                        onQuitarSabor={presentacionId => quitarSabor(clave, presentacionId)}
                        onCambiarAdicional={valor => cambiarAdicional(clave, valor)}
                        accentColor={accentColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        borderColor={borderColor}
                        isDark={isDark}
                      />
                    );
                  })}
                </>
              )}

              <View style={styles.resumen}>
                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                  {totalSeleccionado} de {filas.length}{' '}
                  {filas.length === 1 ? 'entrada' : 'entradas'} por entregar
                </Text>
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                  Un corte por persona. Puedes repetir el mismo producto o elegir varios.
                </Text>
              </View>

              <AnimatedButton
                onPress={entregar}
                disabled={submitDeshabilitado}
                style={[
                  styles.submit,
                  { backgroundColor: accentColor, opacity: submitDeshabilitado ? 0.55 : 1 },
                ]}
              >
                {entregando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {modo === 'solicitud'
                      ? (totalSeleccionado > 0
                          ? `SOLICITAR AUTORIZACIÓN DE ${totalSeleccionado}`
                          : 'SOLICITAR AUTORIZACIÓN')
                      : (totalSeleccionado > 0
                          ? `ENTREGAR ${totalSeleccionado} EN LA BARRA`
                          : 'ENTREGAR EN LA BARRA')}
                  </Text>
                )}
              </AnimatedButton>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
