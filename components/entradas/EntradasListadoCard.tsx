import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { EntradaCliente } from '@/services/entradas';
import { formatCurrency } from '@/utils/format';

export interface GrupoEntrada {
  id: string;
  cliente: string;
  cantidad: number;
  costoUnitario: number;
  total: number;
  metodo: string;
  adicional: number;
  entregadas: number;
  anuladas: number;
}

/**
 * Con adicional la entrada entera se registra como venta (entrada + adicional);
 * sin adicional, la cortesia solo queda entregada cuando se sirvio completa.
 */
export function estadoDelGrupo(grupo: GrupoEntrada): { label: string; color: string } {
  if (grupo.anuladas === grupo.cantidad) return { label: 'Anulada', color: '#EF4444' };
  if (grupo.adicional > 0) return { label: 'Venta', color: '#3B82F6' };
  if (grupo.entregadas === grupo.cantidad) return { label: 'Entregado', color: '#10B981' };
  if (grupo.entregadas === 0) return { label: 'Pendiente', color: '#F59E0B' };
  return { label: 'Parcial', color: '#8B5CF6' };
}

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
      if (entrada.cortesia_estado === 'entregada') actual.entregadas += 1;
      if (entrada.cortesia_estado === 'anulada') actual.anuladas += 1;
    } else {
      mapa.set(clave, {
        id: clave,
        cliente: entrada.cliente_nombre || 'Cliente sin nombre',
        cantidad: 1,
        costoUnitario: monto,
        total: monto,
        metodo: entrada.metodo_pago,
        adicional: Number(entrada.monto_bebida_adicional ?? 0),
        entregadas: entrada.cortesia_estado === 'entregada' ? 1 : 0,
        anuladas: entrada.cortesia_estado === 'anulada' ? 1 : 0,
      });
    }
  }
  return Array.from(mapa.values());
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

  const grupos = useMemo(() => agruparEntradas(entradas), [entradas]);
  const total = useMemo(
    () => entradas.reduce((sum, entrada) => sum + Number(entrada.monto_entrada), 0),
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
        </View>
        <View style={styles.headerRight}>
          <Text style={{ color: textSecondary, fontSize: 12 }}>
            {grupos.length} {grupos.length === 1 ? 'compra' : 'compras'}
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
            return (
              <View key={grupo.id} style={[styles.entradaRow, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}
                    numberOfLines={1}
                  >
                    {grupo.cliente}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                    {grupo.cantidad} {grupo.cantidad === 1 ? 'entrada' : 'entradas'} ·{' '}
                    {formatCurrency(grupo.costoUnitario)} c/u · {grupo.metodo}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                    {formatCurrency(grupo.total)}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: `${estado.color}1F` }]}>
                    <Text style={{ color: estado.color, fontSize: 10, fontWeight: '800' }}>
                      {estado.label}
                    </Text>
                  </View>
                </View>
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
  entradaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
});
