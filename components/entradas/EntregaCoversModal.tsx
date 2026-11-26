import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import { styles } from './EntregaCoversModal.styles';
import { EntregaCoversProducto } from './entrega-covers/EntregaCoversProducto';
import { claveDe, precioVisible } from './entrega-covers/helpers';
import type { EntregaCoversModalProps } from './entrega-covers/types';
import { useEntregaCovers } from './entrega-covers/useEntregaCovers';
import { useState } from 'react';

/** Icono Ionicons según el nombre de la categoría. */
function iconoDeCategoria(nombre: string): [string, string] {
  const n = nombre.toLowerCase();
  if (n.includes('whisky') || n.includes('whisk')) return ['wine', '#F59E0B'];
  if (n.includes('ron') || n.includes('rum')) return ['wine', '#B45309'];
  if (n.includes('vino')) return ['wine', '#DC2626'];
  if (n.includes('cerveza') || n.includes('beer')) return ['beer', '#D97706'];
  if (n.includes('tequila')) return ['flame', '#EF4444'];
  if (n.includes('vodka')) return ['snow', '#60A5FA'];
  if (n.includes('ginebra') || n.includes('gin')) return ['leaf', '#10B981'];
  if (n.includes('mezcla') || n.includes('mixer') || n.includes('refresco')) return ['water', '#3B82F6'];
  if (n.includes('coctel') || n.includes('cocktail')) return ['flame', '#F97316'];
  if (n.includes('licor')) return ['flame', '#A855F7'];
  if (n.includes('aguardiente')) return ['flame', '#84CC16'];
  if (n.includes('cafe') || n.includes('coffee')) return ['cafe', '#92400E'];
  if (n.includes('jugo') || n.includes('juice')) return ['water', '#F97316'];
  if (n.includes('agua')) return ['water', '#0EA5E9'];
  if (n.includes('postre') || n.includes('dessert')) return ['cafe', '#F59E0B'];
  if (n.includes('snack') || n.includes('botana')) return ['cafe', '#F59E0B'];
  return ['pricetag', '#6B7280'];
}

export type { GrupoEntrega } from './entrega-covers/types';
export function EntregaCoversModal({
  visible,
  grupo,
  tope,
  onClose,
  onEntregado,
  modo = 'entrega',
}: EntregaCoversModalProps) {
  const { accentColor, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor, accentOnSurface} = useAccentColor();
  // Las categorías arrancan abiertas: se guarda cuáles están plegadas y no
  // cuáles están abiertas, así no hace falta sincronizar el estado con un
  // efecto cada vez que el modal se abre o cambia la lista.
  const [categoriasColapsadas, setCategoriasColapsadas] = useState<Set<string>>(() => new Set());

  const toggleCategoria = (cat: string) => {
    setCategoriasColapsadas(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const {
    busqueda,
    setBusqueda,
    tipoEntrega,
    setTipoEntrega,
    entradaIndividualId,
    setEntradaIndividualId,
    cargando,
    error,
    errorMonto,
    entregando,
    filas,
    totalEntradas,
    montoAdicional,
    cambiarMontoAdicional,
    adicional,
    presupuesto,
    seleccion,
    visibles,
    gruposVisibles,
    totalSeleccionado,
    precioSeleccionado,
    excedePresupuesto,
    excedeStock,
    puedeAgregar,
    repartoDeLinea,
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

  const fondo = cardBg;
  const submitDeshabilitado =
    entregando ||
    cargando ||
    lineas.length === 0 ||
    faltanAcompanamientos ||
    excedePresupuesto ||
    excedeStock ||
    Boolean(error) ||
    filas.length === 0;

  return (
    <Modal visible={visible} avoidKeyboard={false} transparent animationType="slide" onRequestClose={cerrar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: fondo, borderColor, maxHeight: '92%' }]}>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                    {modo === 'solicitud' ? 'SOLICITAR COVERS' : 'ENTREGAR COVERS'}
                  </Text>
                  <Text
                    style={{
                      color: textPrimary,
                      fontWeight: '800',
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {grupo?.cliente || 'Cliente sin nombre'}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 12 }}>
                    {filas.length}{' '}
                    {filas.length === 1 ? 'entrada pendiente' : 'entradas pendientes'} ·{' '}
                    {formatCurrency(filas.reduce((suma, fila) => suma + fila.monto_entrada, 0))}
                  </Text>
                  {modo === 'solicitud' && grupo?.metodo_pago && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: `${accentColor}18`,
                      }}>
                        <Ionicons
                          name={
                            grupo.metodo_pago === 'efectivo' ? 'cash-outline' :
                            grupo.metodo_pago === 'tarjeta' ? 'card-outline' :
                            'send-outline'
                          }
                          size={12}
                          color={accentOnSurface}
                        />
                        <Text style={{ color: accentOnSurface, fontSize: 11, fontWeight: '700' }}>
                          {grupo.metodo_pago === 'efectivo' ? 'Efectivo' :
                           grupo.metodo_pago === 'tarjeta' ? 'Tarjeta' :
                           grupo.metodo_pago === 'transferencia' ? 'Transferencia' : grupo.metodo_pago}
                        </Text>
                      </View>
                      {grupo.metodo_pago === 'transferencia' && grupo.baucher_foto && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          backgroundColor: `${textSecondary}15`,
                        }}>
                          <Ionicons name="document-text-outline" size={12} color={textSecondary} />
                          <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '600' }}>
                            Con baucher
                          </Text>
                        </View>
                      )}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: '#F59E0B18',
                      }}>
                        <Ionicons name="information-circle-outline" size={12} color="#F59E0B" />
                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '600' }}>
                          Requiere aprobación del cajero
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                <Pressable onPress={cerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar modal de entrega">
                  <Ionicons name="close" size={22} color={textSecondary} />
                </Pressable>
              </View>

              {grupo && grupo.filas.length > 1 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                    MODALIDAD DE ENTREGA
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([
                      { tipo: 'grupal' as const, label: 'Grupal', icono: 'people-outline' as const },
                      {
                        tipo: 'individual' as const,
                        label: 'Individual',
                        icono: 'person-outline' as const,
                      },
                    ]).map(({ tipo, label, icono }) => {
                      const seleccionada = tipoEntrega === tipo;
                      return (
                        <Pressable
                          key={tipo}
                          onPress={() => setTipoEntrega(tipo)}
                          accessibilityRole="button"
                          accessibilityLabel={`Entrega ${label.toLowerCase()}`}
                          accessibilityState={{ selected: seleccionada, disabled: entregando }}
                          disabled={entregando}
                          style={{
                            flex: 1,
                            minHeight: 48,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderWidth: 1,
                            borderRadius: 999,
                            borderColor: seleccionada ? accentColor : borderColor,
                            backgroundColor: seleccionada ? accentColor : surfaceMuted,
                            opacity: entregando ? 0.6 : 1,
                          }}
                        >
                          <Ionicons
                            name={icono}
                            size={16}
                            color={seleccionada ? '#FFFFFF' : textSecondary}
                          />
                          <Text
                            style={{
                              color: seleccionada ? '#FFFFFF' : textPrimary,
                              fontSize: 12,
                              fontWeight: '800',
                            }}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {tipoEntrega === 'individual' && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                        SELECCIONA LA ENTRADA
                      </Text>
                      <View style={{ gap: 6 }}>
                        {grupo.filas.map((fila, indice) => {
                          const seleccionada = entradaIndividualId === fila.id;
                          const etiqueta = [
                            `Entrada ${indice + 1}`,
                            formatCurrency(Number(fila.monto_entrada)),
                            fila.hora,
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <Pressable
                              key={fila.id}
                              onPress={() => setEntradaIndividualId(fila.id)}
                              accessibilityRole="button"
                              accessibilityLabel={etiqueta}
                              accessibilityState={{ selected: seleccionada, disabled: entregando }}
                              disabled={entregando}
                              style={{
                                minHeight: 44,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                paddingHorizontal: 12,
                                borderWidth: 1,
                                borderRadius: 999,
                                borderColor: seleccionada ? accentColor : borderColor,
                                backgroundColor: seleccionada ? `${accentColor}14` : surfaceMuted,
                                opacity: entregando ? 0.6 : 1,
                              }}
                            >
                              <Ionicons
                                name={seleccionada ? 'radio-button-on' : 'radio-button-off'}
                                size={17}
                                color={seleccionada ? accentOnSurface : textSecondary}
                              />
                              <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>
                                {etiqueta}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar producto"
                placeholderTextColor={textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: surfaceMuted,
                    borderColor,
                    color: textPrimary,
                  },
                ]}
              />

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                  {tipoEntrega === 'individual'
                    ? 'MONTO ADICIONAL DE ESTA ENTRADA'
                    : 'MONTO ADICIONAL DEL GRUPO'}
                </Text>
                <TextInput
                  value={montoAdicional}
                  onChangeText={cambiarMontoAdicional}
                  editable={!entregando}
                  accessibilityLabel={
                    tipoEntrega === 'individual'
                      ? 'Monto adicional de esta entrada'
                      : 'Monto adicional del grupo'
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: surfaceMuted,
                      borderColor,
                      color: textPrimary,
                      marginTop: 0,
                    },
                  ]}
                />
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 6 }}>
                  Entradas {formatCurrency(totalEntradas)}
                  {adicional > 0 ? ` + adicional ${formatCurrency(adicional)}` : ''} = presupuesto{' '}
                  {formatCurrency(presupuesto)}. El adicional se cobra completo con el método de{' '}
                  {tipoEntrega === 'individual' ? 'esta entrada.' : 'pago del grupo.'}
                </Text>
                {errorMonto ? (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}
                  >
                    {errorMonto}
                  </Text>
                ) : null}
              </View>

              {cargando ? (
                <View style={{ paddingVertical: 24 }}>
                  <ActivityIndicator color={accentOnSurface} />
                </View>
              ) : error ? (
                <Text
                  style={{
                    color: '#EF4444',
                    fontSize: 12,
                    paddingVertical: 16,
                  }}
                >
                  {error}
                </Text>
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
                  {gruposVisibles.map(({ categoria, items }) => {
                    const expandida = !categoriasColapsadas.has(categoria);
                    const [icono, colorIcono] = iconoDeCategoria(categoria);
                    const seleccionadosEnCategoria = items.reduce((sum, { bebida, formato }) => {
                      const clave = claveDe(bebida, formato);
                      return sum + (seleccion[clave]?.cantidad ?? 0);
                    }, 0);

                    return (
                      <View
                        key={categoria}
                        style={[
                          styles.categoryCard,
                          {
                            borderColor: expandida ? accentColor : borderColor,
                            backgroundColor: expandida ? `${accentColor}08` : 'transparent',
                          },
                        ]}
                      >
                        <Pressable
                          onPress={() => toggleCategoria(categoria)}
                          style={styles.categoryHeader}
                          accessibilityRole="button"
                          accessibilityLabel={`${expandida ? 'Colapsar' : 'Expandir'} categoría ${categoria}`}
                          accessibilityState={{ expanded: expandida }}
                        >
                          <View
                            style={[
                              styles.categoryIcon,
                              { backgroundColor: `${colorIcono}1F` },
                            ]}
                          >
                            <Ionicons name={icono as any} size={20} color={colorIcono} />
                          </View>
                          <View style={styles.categoryInfo}>
                            <Text
                              style={{
                                color: textPrimary,
                                fontWeight: '700',
                                fontSize: 14,
                              }}
                              numberOfLines={1}
                            >
                              {categoria}
                            </Text>
                            <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                              {items.length}{' '}
                              {items.length === 1 ? 'producto' : 'productos'}
                              {seleccionadosEnCategoria > 0
                                ? ` · ${seleccionadosEnCategoria} seleccionado${seleccionadosEnCategoria > 1 ? 's' : ''}`
                                : ''}
                            </Text>
                          </View>
                          {seleccionadosEnCategoria > 0 && (
                            <View
                              style={[
                                styles.categoryBadge,
                                { backgroundColor: `${accentColor}25` },
                              ]}
                            >
                              <Text
                                style={{
                                  color: accentOnSurface,
                                  fontWeight: '800',
                                  fontSize: 12,
                                }}
                              >
                                {seleccionadosEnCategoria}
                              </Text>
                            </View>
                          )}
                          <Ionicons
                            name={expandida ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={textSecondary}
                          />
                        </Pressable>

                        {expandida && (
                          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                            {items.map(({ bebida, formato }) => {
                              const clave = claveDe(bebida, formato);
                              return (
                                <EntregaCoversProducto
                                  key={clave}
                                  bebida={bebida}
                                  formato={formato}
                                  linea={seleccion[clave]}
                                  precio={precioVisible(bebida, formato)}
                                  limiteAlcanzado={!puedeAgregar(bebida, formato)}
                                  infoReparto={repartoDeLinea(bebida, formato)}
                                  onAgregar={() => agregar(bebida, formato)}
                                  onQuitar={() => quitar(clave)}
                                  onAgregarSabor={(opcion) => agregarSabor(clave, opcion)}
                                  onAjustarSabor={(presentacionId, delta) =>
                                    ajustarSabor(clave, presentacionId, delta)
                                  }
                                  onQuitarSabor={(presentacionId) => quitarSabor(clave, presentacionId)}
                                  accentColor={accentColor}
                                  textPrimary={textPrimary}
                                  textSecondary={textSecondary}
                                  borderColor={borderColor}
                                />
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              <View style={styles.resumen}>
                <Text
                  style={{
                    color: textPrimary,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {totalSeleccionado} productos para {filas.length}{' '}
                  {filas.length === 1 ? 'entrada' : 'entradas'}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                  Productos {formatCurrency(precioSeleccionado)} de {formatCurrency(presupuesto)}
                  {adicional > 0 ? ` · se cobra en barra ${formatCurrency(adicional)}` : ''}
                </Text>
                {excedePresupuesto && (
                  <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>
                    Faltan {formatCurrency(precioSeleccionado - presupuesto)} de presupuesto para
                    esta selección.
                  </Text>
                )}
                {excedeStock ? (
                  <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>
                    La selección supera el stock disponible. Ajusta los productos o acompañamientos.
                  </Text>
                ) : null}
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 4 }}>
                  {tipoEntrega === 'individual'
                    ? 'Presupuesto de esta entrada. Puedes repetir productos o elegir varios hasta agotar el presupuesto y stock.'
                    : 'Presupuesto compartido. Puedes repetir productos o elegir varios hasta agotar el presupuesto y stock.'}
                </Text>
              </View>

              <AnimatedButton
                onPress={entregar}
                disabled={submitDeshabilitado}
                style={[
                  styles.submit,
                  {
                    backgroundColor: accentColor,
                    opacity: submitDeshabilitado ? 0.55 : 1,
                  },
                ]}
              >
                {entregando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {modo === 'solicitud'
                      ? totalSeleccionado > 0
                        ? `SOLICITAR AUTORIZACIÓN DE ${totalSeleccionado}`
                        : 'SOLICITAR AUTORIZACIÓN'
                      : totalSeleccionado > 0
                        ? `ENTREGAR ${totalSeleccionado} EN LA BARRA`
                        : 'ENTREGAR EN LA BARRA'}
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
