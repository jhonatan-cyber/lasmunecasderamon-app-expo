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
import { styles } from './EntregaCoversModal.styles';
import { EntregaCoversProducto } from './entrega-covers/EntregaCoversProducto';
import { claveDe, precioVisible } from './entrega-covers/helpers';
import type { EntregaCoversModalProps } from './entrega-covers/types';
import { useEntregaCovers } from './entrega-covers/useEntregaCovers';

export type { GrupoEntrega } from './entrega-covers/types';
export function EntregaCoversModal({
  visible,
  grupo,
  tope,
  onClose,
  onEntregado,
  modo = 'entrega',
}: EntregaCoversModalProps) {
  const { accentColor, textPrimary, textSecondary, borderColor, isDark } = useAccentColor();
  const {
    acompanamientos,
    busqueda,
    setBusqueda,
    cargando,
    error,
    entregando,
    filas,
    totalEntradas,
    montoAdicional,
    cambiarMontoAdicional,
    adicional,
    presupuesto,
    seleccion,
    visibles,
    totalSeleccionado,
    precioSeleccionado,
    cobroBarra,
    presupuestoInsuficiente,
    excedePresupuesto,
    excedeAdicional,
    lineas,
    faltanAcompanamientos,
    agregar,
    quitar,
    agregarSabor,
    ajustarSabor,
    quitarSabor,
    cerrar,
    entregar,
  } = useEntregaCovers({ visible, grupo, tope, onClose, onEntregado, modo });

  const fondo = isDark ? '#111827' : '#FFFFFF';
  const submitDeshabilitado =
    entregando ||
    cargando ||
    lineas.length === 0 ||
    faltanAcompanamientos ||
    presupuestoInsuficiente;

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
                    ENTREGAR COVERS
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

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                  MONTO ADICIONAL DEL GRUPO
                </Text>
                <TextInput
                  value={montoAdicional}
                  onChangeText={cambiarMontoAdicional}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                      borderColor,
                      color: textPrimary,
                      marginTop: 0,
                    },
                  ]}
                />
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 6 }}>
                  Entradas {formatCurrency(totalEntradas)}
                  {adicional > 0 ? ` + adicional ${formatCurrency(adicional)}` : ''} = presupuesto{' '}
                  {formatCurrency(presupuesto)}
                </Text>
              </View>

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
                      Sin productos hasta {formatCurrency(presupuesto)} con stock en el bar.
                    </Text>
                  )}
                  {visibles.map(({ bebida, formato }) => {
                    const clave = claveDe(bebida, formato);
                    return (
                      <EntregaCoversProducto
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
                        accentColor={accentColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        borderColor={borderColor}
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
                  Productos {formatCurrency(precioSeleccionado)} de{' '}
                  {formatCurrency(presupuesto)}
                  {cobroBarra > 0 ? ` · se cobra en barra ${formatCurrency(cobroBarra)}` : ''}
                </Text>
                {excedePresupuesto && (
                  <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>
                    Faltan {formatCurrency(precioSeleccionado - presupuesto)} de presupuesto para
                    esta selección.
                  </Text>
                )}
                {excedeAdicional && (
                  <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>
                    El cobro en barra supera el monto adicional en{' '}
                    {formatCurrency(cobroBarra - adicional)}.
                  </Text>
                )}
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 4 }}>
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
