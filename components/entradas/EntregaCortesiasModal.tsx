import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { entradasService, type EntradaPendiente } from '@/services/entradas';
import { productsService } from '@/services/products';
import { formatCurrency } from '@/utils/format';
import logger from '@/utils/logger';
import { showToast } from '@/utils/toast-lazy';

/**
 * Entrega de las cortesías de una compra completa desde la barra.
 *
 * La cola trae una fila por persona, pero la barra sirve a la mesa: se elige
 * uno o varios cortes (el mismo producto repetido o productos distintos) y se
 * reparten en orden entre las entradas pendientes del grupo. Un corte se cobra
 * con el precio del shot configurado (`opciones_venta`), no con el de la
 * botella, y descuenta ml del bar en vez de una botella entera.
 */

export interface GrupoEntrega {
  id: string;
  cliente: string;
  filas: EntradaPendiente[];
}

interface OpcionVenta {
  tipo?: string;
  precio?: number;
  precio_sin_anfitriona?: number;
  acompanamiento?: { unidades?: number };
}

interface Bebida {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  precio_sin_anfitriona: number;
  stock_bar: number;
  categoria_nombre: string | null;
  opciones_venta: OpcionVenta[];
}

interface Acompanamiento {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  stock_bar: number;
}

type Formato = 'corte' | 'botella';

interface LineaSeleccion {
  cantidad: number;
  acompanamientoId: string;
  adicional: string;
}

interface Props {
  visible: boolean;
  grupo: GrupoEntrega | null;
  /** Tope de la cortesía (`monto_base_trago_cortesia_cliente`). */
  tope: number;
  onClose: () => void;
  onEntregado: () => void | Promise<void>;
}

const normalizar = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Analcohólicas y cigarrillos no son cover de una entrada. */
function categoriaFueraDeCortesia(categoria: string | null | undefined): boolean {
  const texto = normalizar(categoria || '');
  return texto.includes('analcohol') || texto.includes('cigarr');
}

function opcionesDe(valor: unknown): OpcionVenta[] {
  if (Array.isArray(valor)) return valor as OpcionVenta[];
  if (typeof valor === 'string') {
    try {
      const parseado = JSON.parse(valor);
      return Array.isArray(parseado) ? (parseado as OpcionVenta[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function numero(valor: unknown): number {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function bebidaDe(valor: unknown): Bebida | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = valor as Record<string, unknown>;
  const presentacionId = String(fila.presentacion_id ?? '');
  if (!presentacionId) return null;
  const opciones = opcionesDe(fila.opciones_venta);
  const botella = opciones.find(opcion => opcion.tipo === 'botella');
  const precioSinAnfitriona = numero(botella?.precio_sin_anfitriona);
  return {
    presentacion_id: presentacionId,
    producto_nombre: String(fila.producto_nombre ?? ''),
    presentacion_nombre: String(fila.presentacion_nombre ?? ''),
    precio_venta: numero(fila.precio_venta),
    precio_sin_anfitriona:
      precioSinAnfitriona > 0 ? precioSinAnfitriona : numero(fila.precio_venta),
    stock_bar: numero(fila.stock_bar),
    categoria_nombre:
      typeof fila.categoria_nombre === 'string' && fila.categoria_nombre.trim()
        ? fila.categoria_nombre
        : null,
    opciones_venta: opciones,
  };
}

function acompanamientoDe(valor: unknown): Acompanamiento | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = valor as Record<string, unknown>;
  const presentacionId = String(fila.presentacion_id ?? '');
  if (!presentacionId) return null;
  return {
    presentacion_id: presentacionId,
    producto_nombre: String(fila.producto_nombre ?? ''),
    presentacion_nombre: String(fila.presentacion_nombre ?? ''),
    stock_bar: numero(fila.stock_bar),
  };
}

/** Precio del corte (shot) para cliente; `null` si no se vende por corte. */
function precioCorte(bebida: Bebida): number | null {
  const shot = bebida.opciones_venta.find(opcion => opcion.tipo === 'shot');
  const precio = numero(shot?.precio);
  return precio > 0 ? precio : null;
}

function unidadesAcompanamientoBebida(bebida: Bebida): number {
  const botella = bebida.opciones_venta.find(opcion => opcion.tipo === 'botella');
  const unidades = numero(botella?.acompanamiento?.unidades);
  return unidades > 0 ? Math.floor(unidades) : 0;
}

/**
 * Formato con el que la entrada se puede servir dentro del tope. Se prefiere el
 * corte: es el trago de cortesía; la botella queda para lo que no se vende por
 * corte (cervezas, aguas, etc.).
 */
function formatoCortesia(bebida: Bebida, umbral: number): Formato | null {
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= umbral) return 'corte';
  // La botella se muestra con su precio sin anfitriona y solo si además el
  // precio que valida el servidor entra en el tope: si no, la entrega fallaría.
  if (
    bebida.precio_sin_anfitriona <= umbral &&
    bebida.precio_venta <= umbral
  ) {
    return 'botella';
  }
  return null;
}

function precioVisible(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? (precioCorte(bebida) ?? 0) : bebida.precio_sin_anfitriona;
}

function requiereAcompanamiento(bebida: Bebida, formato: Formato): boolean {
  // Un corte cliente siempre lleva una unidad de bebida, igual que en ventas.
  return formato === 'corte' || unidadesAcompanamientoBebida(bebida) > 0;
}

const claveDe = (bebida: Bebida, formato: Formato) =>
  `${bebida.presentacion_id}:${formato}`;

export function EntregaCortesiasModal({ visible, grupo, tope, onClose, onEntregado }: Props) {
  const { accentColor, textPrimary, textSecondary, borderColor, isDark } = useAccentColor();
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, LineaSeleccion>>({});
  const [entregando, setEntregando] = useState(false);

  const filasDelGrupo = grupo?.filas;
  const filas = useMemo(() => filasDelGrupo ?? [], [filasDelGrupo]);
  const umbral = Math.max(tope, filas[0]?.monto_entrada ?? 0);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [resBebidas, resCover] = await Promise.all([
          productsService.forSale(controller.signal),
          productsService.forCover(controller.signal).catch(() => null),
        ]);
        if (controller.signal.aborted) return;
        const lista = (resBebidas as { data?: unknown[] })?.data;
        if (!resBebidas.success || !Array.isArray(lista)) {
          throw new Error(resBebidas.message || 'No se pudieron cargar las bebidas del bar');
        }
        setBebidas(
          lista
            .map(bebidaDe)
            .filter((bebida): bebida is Bebida => bebida !== null && bebida.stock_bar > 0),
        );
        const cover = (resCover as { data?: unknown[] } | null)?.data;
        setAcompanamientos(
          Array.isArray(cover)
            ? cover
                .map(acompanamientoDe)
                .filter(
                  (fila): fila is Acompanamiento => fila !== null && fila.stock_bar > 0,
                )
            : [],
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.fetchError(err, { context: 'EntregaCortesias:cargar' });
        setError(
          err instanceof Error ? err.message : 'No se pudieron cargar las bebidas del bar',
        );
        setBebidas([]);
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    })();
    return () => controller.abort();
  }, [visible, grupo?.id]);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return bebidas
      .map(bebida => ({ bebida, formato: formatoCortesia(bebida, umbral) }))
      .filter(
        (fila): fila is { bebida: Bebida; formato: Formato } =>
          fila.formato !== null && !categoriaFueraDeCortesia(fila.bebida.categoria_nombre),
      )
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(
            termino,
          ),
      );
  }, [bebidas, busqueda, seleccion, umbral]);

  const totalSeleccionado = useMemo(
    () => Object.values(seleccion).reduce((suma, linea) => suma + linea.cantidad, 0),
    [seleccion],
  );

  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      const clave = claveDe(bebida, formato);
      setSeleccion(previo => {
        const total = Object.values(previo).reduce((suma, linea) => suma + linea.cantidad, 0);
        if (total >= filas.length) return previo;
        const actual = previo[clave]?.cantidad ?? 0;
        return {
          ...previo,
          [clave]: {
            cantidad: actual + 1,
            acompanamientoId: previo[clave]?.acompanamientoId ?? '',
            adicional: previo[clave]?.adicional ?? '',
          },
        };
      });
    },
    [filas.length],
  );

  const quitar = useCallback((clave: string) => {
    setSeleccion(previo => {
      const actual = previo[clave];
      if (!actual) return previo;
      if (actual.cantidad <= 1) {
        const resto = { ...previo };
        delete resto[clave];
        return resto;
      }
      return { ...previo, [clave]: { ...actual, cantidad: actual.cantidad - 1 } };
    });
  }, []);

  const cambiarAcompanamiento = useCallback(
    (clave: string, acompanamientoId: string) => {
      setSeleccion(previo =>
        previo[clave]
          ? { ...previo, [clave]: { ...previo[clave], acompanamientoId } }
          : previo,
      );
    },
    [],
  );

  const cambiarAdicional = useCallback((clave: string, valor: string) => {
    setSeleccion(previo =>
      previo[clave]
        ? { ...previo, [clave]: { ...previo[clave], adicional: valor.replace(/[^\d]/g, '') } }
        : previo,
    );
  }, []);

  const lineas = useMemo(
    () =>
      Object.entries(seleccion).flatMap(([clave, linea]) => {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
        if (!bebida) return [];
        return [{ clave, bebida, formato, ...linea }];
      }),
    [bebidas, seleccion],
  );

  const faltanAcompanamientos = useMemo(
    () =>
      lineas.some(linea => {
        if (!requiereAcompanamiento(linea.bebida, linea.formato)) return false;
        const unidades = linea.formato === 'corte' ? 1 : unidadesAcompanamientoBebida(linea.bebida);
        const necesarias = unidades * linea.cantidad;
        const disponibles = acompanamientos.filter(
          opcion =>
            opcion.presentacion_id !== linea.bebida.presentacion_id &&
            opcion.stock_bar >= necesarias,
        );
        // El corte puede salir sin bebida si no hay cover en el bar; la botella
        // con acompañamiento configurado no: el servidor la exige.
        if (disponibles.length === 0) return linea.formato === 'botella';
        return !disponibles.some(opcion => opcion.presentacion_id === linea.acompanamientoId);
      }),
    [acompanamientos, lineas],
  );

  const cerrar = useCallback(() => {
    if (entregando) return;
    onClose();
  }, [entregando, onClose]);

  const entregar = useCallback(async () => {
    if (!grupo || entregando) return;
    if (lineas.length === 0) {
      showToast({
        type: 'info',
        text1: 'Elige los productos',
        text2: 'Selecciona al menos un corte para entregar.',
      });
      return;
    }
    if (faltanAcompanamientos) {
      showToast({
        type: 'error',
        text1: 'Falta el acompañamiento',
        text2: 'Elige la bebida analcohólica de los cortes seleccionados.',
      });
      return;
    }
    if (totalSeleccionado > filas.length) {
      showToast({
        type: 'error',
        text1: 'Demasiados productos',
        text2: `Solo quedan ${filas.length} entradas pendientes en este grupo.`,
      });
      return;
    }

    // Una unidad por entrada, en el orden de la cola del grupo.
    const unidades: {
      presentacion_id: string;
      formato: Formato;
      acompanamientoId: string;
      adicional: string;
    }[] = [];
    for (const linea of lineas) {
      for (let indice = 0; indice < linea.cantidad; indice += 1) {
        unidades.push({
          presentacion_id: linea.bebida.presentacion_id,
          formato: linea.formato,
          acompanamientoId: linea.acompanamientoId,
          adicional: linea.adicional,
        });
      }
    }

    setEntregando(true);
    let entregadas = 0;
    try {
      for (const unidad of unidades) {
        const fila = filas[entregadas];
        if (!fila) throw new Error('El grupo ya no tiene entradas pendientes');
        const adicional = unidad.adicional.trim();
        const res = await entradasService.entregar(fila.id, {
          presentacion_id: unidad.presentacion_id,
          tipo_entrega: unidad.formato,
          acompanamiento_presentacion_id: unidad.acompanamientoId || null,
          ...(adicional ? { monto_adicional: Number(adicional) } : {}),
        });
        if (!res.success) throw new Error(res.message || 'No se pudo entregar la cortesía');
        entregadas += 1;
      }
      showToast({
        type: 'success',
        text1: entregadas === 1 ? 'Cortesía entregada' : `${entregadas} cortesías entregadas`,
        text2: grupo.cliente,
      });
      await onEntregado();
      onClose();
    } catch (err) {
      logger.fetchError(err, { context: 'EntregaCortesias:entregar' });
      showToast({
        type: 'error',
        text1:
          entregadas > 0
            ? `Se entregaron ${entregadas} de ${unidades.length}`
            : 'No se pudo entregar',
        text2: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
      if (entregadas > 0) {
        await onEntregado();
        onClose();
      }
    } finally {
      setEntregando(false);
    }
  }, [
    entregando,
    faltanAcompanamientos,
    filas,
    grupo,
    lineas,
    onClose,
    onEntregado,
    totalSeleccionado,
  ]);

  const fondo = isDark ? '#111827' : '#FFFFFF';

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
                    const linea = seleccion[clave];
                    const precio = precioVisible(bebida, formato);
                    const limiteAlcanzado = totalSeleccionado >= filas.length;
                    const acompanamientoRequerido = requiereAcompanamiento(bebida, formato);
                    const unidadesBebida =
                      formato === 'corte' ? 1 : unidadesAcompanamientoBebida(bebida);
                    const unidadesNecesarias = unidadesBebida * (linea?.cantidad ?? 1);
                    const opcionesCover = acompanamientos.filter(
                      opcion =>
                        opcion.presentacion_id !== bebida.presentacion_id &&
                        opcion.stock_bar >= unidadesNecesarias,
                    );
                    const faltaAcompanamiento =
                      acompanamientoRequerido &&
                      (opcionesCover.length === 0
                        ? formato === 'botella'
                        : !opcionesCover.some(
                            opcion => opcion.presentacion_id === linea?.acompanamientoId,
                          ));
                    return (
                      <View
                        key={clave}
                        style={[
                          styles.producto,
                          {
                            borderColor: linea ? accentColor : borderColor,
                            backgroundColor: linea ? `${accentColor}14` : 'transparent',
                          },
                        ]}
                      >
                        <View style={styles.productoFila}>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}
                              numberOfLines={2}
                            >
                              {[bebida.producto_nombre, bebida.presentacion_nombre]
                                .filter(Boolean)
                                .join(' ')}
                            </Text>
                            <Text style={{ color: textSecondary, fontSize: 11 }}>
                              {formato === 'corte' ? 'Corte' : 'Botella sin anfitriona'} ·{' '}
                              {formatCurrency(precio)} · stock {bebida.stock_bar}
                            </Text>
                          </View>
                          <View style={styles.stepper}>
                            <Pressable
                              onPress={() => quitar(clave)}
                              disabled={!linea}
                              hitSlop={8}
                              style={[
                                styles.stepperBtn,
                                { borderColor, opacity: linea ? 1 : 0.35 },
                              ]}
                            >
                              <Ionicons name="remove" size={16} color={textPrimary} />
                            </Pressable>
                            <Text style={[styles.stepperValue, { color: textPrimary }]}>
                              {linea?.cantidad ?? 0}
                            </Text>
                            <Pressable
                              onPress={() => agregar(bebida, formato)}
                              disabled={limiteAlcanzado}
                              hitSlop={8}
                              style={[
                                styles.stepperBtn,
                                {
                                  borderColor,
                                  backgroundColor: limiteAlcanzado
                                    ? 'transparent'
                                    : `${accentColor}1F`,
                                  opacity: limiteAlcanzado ? 0.35 : 1,
                                },
                              ]}
                            >
                              <Ionicons name="add" size={16} color={accentColor} />
                            </Pressable>
                          </View>
                        </View>

                        {linea && (
                          <>
                            {acompanamientoRequerido && (
                              <View style={{ marginTop: 8 }}>
                                <Text style={[styles.miniLabel, { color: textSecondary }]}>
                                  {formato === 'corte'
                                    ? 'ACOMPAÑAMIENTO DEL CORTE'
                                    : 'ACOMPAÑAMIENTO INCLUIDO'}
                                </Text>
                                {opcionesCover.length === 0 ? (
                                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                                    Sin bebidas cover habilitadas en el bar.
                                  </Text>
                                ) : (
                                  <View style={styles.chips}>
                                    {opcionesCover.map(opcion => {
                                      const activo =
                                        opcion.presentacion_id === linea.acompanamientoId;
                                      return (
                                        <Pressable
                                          key={opcion.presentacion_id}
                                          onPress={() =>
                                            cambiarAcompanamiento(
                                              clave,
                                              opcion.presentacion_id,
                                            )
                                          }
                                          style={[
                                            styles.chip,
                                            {
                                              borderColor: activo ? accentColor : borderColor,
                                              backgroundColor: activo
                                                ? `${accentColor}1F`
                                                : 'transparent',
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={{
                                              color: activo ? accentColor : textSecondary,
                                              fontSize: 11,
                                              fontWeight: '700',
                                            }}
                                          >
                                            {[opcion.producto_nombre, opcion.presentacion_nombre]
                                              .filter(Boolean)
                                              .join(' ')}
                                          </Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            )}

                            <View style={{ marginTop: 8 }}>
                              <Text style={[styles.miniLabel, { color: textSecondary }]}>
                                ADICIONAL POR UNIDAD (OPCIONAL)
                              </Text>
                              <TextInput
                                value={linea.adicional}
                                onChangeText={texto => cambiarAdicional(clave, texto)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={textSecondary}
                                style={[
                                  styles.input,
                                  {
                                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                    borderColor,
                                    color: textPrimary,
                                    marginTop: 4,
                                  },
                                ]}
                              />
                            </View>

                            {faltaAcompanamiento && (
                              <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 6 }}>
                                Elige la bebida del corte para continuar.
                              </Text>
                            )}
                          </>
                        )}
                      </View>
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
                disabled={
                  entregando || cargando || lineas.length === 0 || faltanAcompanamientos
                }
                style={[
                  styles.submit,
                  {
                    backgroundColor: accentColor,
                    opacity:
                      entregando || cargando || lineas.length === 0 || faltanAcompanamientos
                        ? 0.55
                        : 1,
                  },
                ]}
              >
                {entregando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {totalSeleccionado > 0
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 8,
  },
  producto: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  productoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resumen: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.25)',
  },
  submit: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
