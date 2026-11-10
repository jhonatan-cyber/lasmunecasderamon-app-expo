import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { EntradaCliente } from '@/services/entradas';
import { BaucherFoto } from '@/components/shared/BaucherFoto';
import { formatCurrency } from '@/utils/format';

export interface GrupoEntrada {
  id: string;
  cliente: string;
  cantidad: number;
  costoUnitario: number;
  /** Cobrado en la puerta: suma de los montos de entrada. */
  total: number;
  metodo: string;
  /** Consumido en la barra por encima del cover. */
  adicional: number;
  /** Total del grupo: puerta + adicional de la barra. */
  totalGrupo: number;
  /** Hora del primer registro del grupo (`HH:MM`). */
  hora: string;
  registradoPor: string;
  entregadas: number;
  anuladas: number;
  /** Anuladas a mano: el dinero se devolvió en la puerta. */
  devueltas: number;
  /** Monto devuelto de las anuladas a mano. */
  devueltoMonto: number;
  /** Id de la fila con baucher, para abrir la foto del grupo. */
  baucherEntradaId: string | null;
  /** Filas de la compra, para el detalle entrada por entrada. */
  registros: EntradaCliente[];
}

/**
 * Con adicional la entrada entera se registra como venta (entrada + adicional);
 * sin adicional, el cover solo queda entregado cuando se sirvio completa.
 */
export function estadoDelGrupo(grupo: GrupoEntrada): { label: string; color: string } {
  if (grupo.anuladas === grupo.cantidad) {
    if (grupo.devueltas === grupo.cantidad) return { label: 'Devuelta', color: '#EF4444' };
    if (grupo.devueltas === 0) return { label: 'Anulada al cierre', color: '#EF4444' };
    return { label: 'Anulada', color: '#EF4444' };
  }
  if (grupo.adicional > 0) return { label: 'Venta', color: '#3B82F6' };
  if (grupo.entregadas === grupo.cantidad) return { label: 'Entregado', color: '#10B981' };
  if (grupo.entregadas === 0) return { label: 'Pendiente', color: '#F59E0B' };
  return { label: 'Parcial', color: '#8B5CF6' };
}

/** Estado de una persona del grupo, igual que el detalle del dashboard. */
export function estadoDeRegistro(entrada: EntradaCliente): { label: string; color: string } {
  if (entrada.cover_estado === 'entregada') return { label: 'Entregada', color: '#10B981' };
  if (entrada.cover_estado === 'anulada') {
    // A mano se devuelve el dinero; al cierre queda cobrada en la caja.
    if (entrada.anulacion_origen === 'manual') return { label: 'Devuelta', color: '#EF4444' };
    if (entrada.anulacion_origen === 'cierre')
      return { label: 'Anulada al cierre', color: '#EF4444' };
    return { label: 'Anulada', color: '#EF4444' };
  }
  return { label: 'Pendiente', color: '#F59E0B' };
}

/** `cover_entregada_at` llega como `AAAA-MM-DD HH:MM`; se muestra sólo la hora. */
function horaDeEntrega(valor: string | null): string | null {
  if (!valor) return null;
  const [, hora] = valor.split(' ');
  return hora || null;
}

/** Texto de la bebida servida: el nombre formateado o los productos entregados. */
const bebidaServida = (entrada: EntradaCliente): string | null =>
  entrada.bebida_cover || entrada.productos_cover || null;

/** Una fila por compra: el grupo comparte nombre, costo unitario y caja. */
export function agruparEntradas(entradas: EntradaCliente[]): GrupoEntrada[] {
  const mapa = new Map<string, GrupoEntrada>();
  for (const entrada of entradas) {
    const clave = entrada.grupo_registro_id ?? entrada.id;
    const monto = Number(entrada.monto_entrada);
    const actual = mapa.get(clave);
    if (actual) {
      actual.cantidad += 1;
      actual.total += monto;
      actual.adicional += Number(entrada.monto_bebida_adicional ?? 0);
      if (entrada.cover_estado === 'entregada') actual.entregadas += 1;
      if (entrada.cover_estado === 'anulada') {
        actual.anuladas += 1;
        if (entrada.anulacion_origen === 'manual') {
          actual.devueltas += 1;
          actual.devueltoMonto += monto;
        }
      }
      if (!actual.baucherEntradaId && entrada.baucher_foto) actual.baucherEntradaId = entrada.id;
      if (entrada.hora && (!actual.hora || entrada.hora < actual.hora)) actual.hora = entrada.hora;
      actual.registros.push(entrada);
    } else {
      mapa.set(clave, {
        id: clave,
        cliente: entrada.cliente_nombre || 'Cliente sin nombre',
        cantidad: 1,
        costoUnitario: monto,
        total: monto,
        metodo: entrada.metodo_pago,
        adicional: Number(entrada.monto_bebida_adicional ?? 0),
        totalGrupo: 0,
        hora: entrada.hora || '',
        registradoPor: entrada.registrado_por_nombre || '',
        entregadas: entrada.cover_estado === 'entregada' ? 1 : 0,
        anuladas: entrada.cover_estado === 'anulada' ? 1 : 0,
        devueltas:
          entrada.cover_estado === 'anulada' && entrada.anulacion_origen === 'manual' ? 1 : 0,
        devueltoMonto:
          entrada.cover_estado === 'anulada' && entrada.anulacion_origen === 'manual' ? monto : 0,
        baucherEntradaId: entrada.baucher_foto ? entrada.id : null,
        registros: [entrada],
      });
    }
  }
  const grupos = Array.from(mapa.values());
  // El dinero devuelto salió del cajón: no suma al total del grupo.
  for (const grupo of grupos) grupo.totalGrupo = grupo.total - grupo.devueltoMonto + grupo.adicional;
  return grupos;
}

interface FilaRegistroProps {
  entrada: EntradaCliente;
  indice: number;
}

/** Detalle de una persona del grupo: qué bebió, quién la atendió y su estado. */
function FilaRegistro({ entrada, indice }: FilaRegistroProps) {
  const { textPrimary, textSecondary } = useAccentColor();
  const estado = estadoDeRegistro(entrada);
  const bebida = bebidaServida(entrada);
  const entrega = horaDeEntrega(entrada.cover_entregada_at);
  const adicional = Number(entrada.monto_bebida_adicional ?? 0);
  const esAnulada = entrada.cover_estado === 'anulada';

  return (
    <View style={styles.registroRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>
          Entrada {indice}
        </Text>
        {bebida && (
          <Text style={{ color: textPrimary, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
            {bebida}
          </Text>
        )}
        {entrada.acompanamiento_bebida && (
          <Text style={{ color: textSecondary, fontSize: 11 }}>
            + {entrada.acompanamiento_bebida}
          </Text>
        )}
        {entrada.cantidad_productos_cover > 1 && (
          <Text style={{ color: textSecondary, fontSize: 11 }}>
            {entrada.cantidad_productos_cover} productos en barra
          </Text>
        )}
        {entrada.cover_estado === 'entregada' && (
          <Text style={{ color: '#10B981', fontSize: 11 }}>
            {entrega ? `Entregada ${entrega}` : 'Entregada'}
            {entrada.cover_entregada_por_nombre ? ` · ${entrada.cover_entregada_por_nombre}` : ''}
          </Text>
        )}
        {entrada.cover_estado === 'pendiente' && (
          <Text style={{ color: '#F59E0B', fontSize: 11 }}>Pendiente de entrega</Text>
        )}
        {esAnulada && (
          <Text style={{ color: '#EF4444', fontSize: 11 }}>
            {entrada.anulacion_origen === 'cierre' ? 'Anulada al cierre' : 'Devuelto en la puerta'}
          </Text>
        )}
        {adicional > 0 && (
          <Text style={{ color: '#3B82F6', fontSize: 11 }}>
            Barra: {formatCurrency(adicional)} adicional
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '800' }}>
          {formatCurrency(Number(entrada.monto_entrada))}
        </Text>
        <Text style={{ color: estado.color, fontSize: 10, fontWeight: '800', marginTop: 2 }}>
          {estado.label}
        </Text>
      </View>
    </View>
  );
}

interface Props {
  entradas: EntradaCliente[];
  /** Mensaje cuando no hay compras que listar. */
  vacio: string;
  titulo?: string;
}

export function EntradasListadoCard({ entradas, vacio, titulo = 'HOY' }: Props) {
  const { cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [abierto, setAbierto] = useState(true);
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);

  const grupos = useMemo(() => agruparEntradas(entradas), [entradas]);
  // Cobrado en la puerta: lo devuelto a mano ya salió del cajón.
  const total = useMemo(
    () =>
      entradas.reduce(
        (sum, entrada) =>
          entrada.anulacion_origen === 'manual' ? sum : sum + Number(entrada.monto_entrada),
        0,
      ),
    [entradas],
  );
  const devueltoTotal = useMemo(
    () =>
      entradas.reduce(
        (sum, entrada) =>
          entrada.anulacion_origen === 'manual' ? sum + Number(entrada.monto_entrada) : sum,
        0,
      ),
    [entradas],
  );
  const totalEntradas = useMemo(
    () => entradas.filter(entrada => entrada.anulacion_origen !== 'manual').length,
    [entradas],
  );

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <Pressable
        onPress={() => setAbierto(actual => !actual)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={abierto ? 'Contraer listado de entradas' : 'Desplegar listado de entradas'}
      >
        <View>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>{titulo}</Text>
          <Text style={[styles.totalValue, { color: textPrimary }]}>{formatCurrency(total)}</Text>
          <Text style={{ color: textSecondary, fontSize: 11 }}>cobrado en la puerta</Text>
          {devueltoTotal > 0 && (
            <Text style={{ color: '#EF4444', fontSize: 11 }}>
              Devuelto {formatCurrency(devueltoTotal)}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={{ color: textSecondary, fontSize: 12 }}>
            {grupos.length} {grupos.length === 1 ? 'compra' : 'compras'} · {totalEntradas}{' '}
            {totalEntradas === 1 ? 'entrada' : 'entradas'}
          </Text>
          <Ionicons
            name={abierto ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={textSecondary}
          />
        </View>
      </Pressable>

      {abierto && (
        <>
          {grupos.length === 0 && (
            <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center' }}>{vacio}</Text>
          )}

          {grupos.map(grupo => {
            const estado = estadoDelGrupo(grupo);
            const puedeDetallar = grupo.registros.length > 1;
            const verDetalle = puedeDetallar && detalleAbierto === grupo.id;
            return (
              <View key={grupo.id} style={[styles.grupo, { borderColor }]}>
                <View style={styles.entradaRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {grupo.cliente}
                    </Text>
                    <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                      {grupo.hora ? `${grupo.hora} · ` : ''}
                      {grupo.cantidad} {grupo.cantidad === 1 ? 'entrada' : 'entradas'} ·{' '}
                      {formatCurrency(grupo.costoUnitario)} c/u · {grupo.metodo}
                    </Text>
                    {grupo.registradoPor && (
                      <Text style={{ color: textSecondary, fontSize: 11, marginTop: 1 }}>
                        Registró {grupo.registradoPor}
                      </Text>
                    )}
                    {grupo.adicional > 0 && (
                      <Text style={{ color: '#3B82F6', fontSize: 11, marginTop: 1 }}>
                        Barra: {formatCurrency(grupo.adicional)} adicional
                      </Text>
                    )}
                    {grupo.devueltoMonto > 0 && (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 1 }}>
                        Devuelto {formatCurrency(grupo.devueltoMonto)}
                      </Text>
                    )}
                    {grupo.baucherEntradaId && (
                      <View style={{ marginTop: 6 }}>
                        <BaucherFoto
                          compacto
                          endpoint={`/tickets/${grupo.baucherEntradaId}/baucher`}
                          descripcion={grupo.cliente}
                        />
                      </View>
                    )}
                    {puedeDetallar && (
                      <Pressable
                        onPress={() =>
                          setDetalleAbierto(actual => (actual === grupo.id ? null : grupo.id))
                        }
                        style={styles.detalleToggle}
                        accessibilityRole="button"
                        accessibilityLabel={
                          verDetalle ? 'Ocultar detalle por entrada' : 'Ver detalle por entrada'
                        }
                      >
                        <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>
                          {verDetalle ? 'Ocultar detalle' : 'Ver detalle por entrada'}
                        </Text>
                        <Ionicons
                          name={verDetalle ? 'chevron-up' : 'chevron-down'}
                          size={13}
                          color={textSecondary}
                        />
                      </Pressable>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                      {formatCurrency(grupo.totalGrupo)}
                    </Text>
                    {grupo.adicional > 0 && (
                      <Text style={{ color: textSecondary, fontSize: 10 }}>
                        {formatCurrency(grupo.total - grupo.devueltoMonto)} + barra
                      </Text>
                    )}
                    <View style={[styles.badge, { backgroundColor: `${estado.color}1F` }]}>
                      <Text style={{ color: estado.color, fontSize: 10, fontWeight: '800' }}>
                        {estado.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {verDetalle &&
                  grupo.registros.map((registro, indice) => (
                    <FilaRegistro key={registro.id} entrada={registro} indice={indice + 1} />
                  ))}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalValue: { fontSize: 20, fontWeight: '900' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grupo: {
    borderTopWidth: 1,
  },
  entradaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  registroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    marginBottom: 2,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(148,163,184,0.4)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  detalleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
