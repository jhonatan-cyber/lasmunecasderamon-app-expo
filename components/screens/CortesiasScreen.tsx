import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  agruparEntradas,
  EntradasListadoCard,
  estadoDelGrupo,
  type GrupoEntrada,
} from '@/components/entradas/EntradasListadoCard';
import { EntregaCortesiasModal } from '@/components/entradas/EntregaCortesiasModal';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useConfigValue } from '@/hooks/useConfigValue';
import { entradasService, type EntradaCliente, type EntradaPendiente } from '@/services/entradas';
import { eventBus } from '@/utils/eventBus';
import { formatCurrency } from '@/utils/format';
import logger from '@/utils/logger';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';

/**
 * Cortesías del día (barman y cajero cuando opera la barra). Paridad con la
 * pestaña Cortesías de la web: la puerta cobra la entrada y aquí la barra sirve
 * la bebida; el servidor decide si es cortesía o adicional según
 * `max(tope, monto_entrada)`.
 *
 * La cola trae una persona por fila, pero la barra atiende la compra completa:
 * cada grupo muestra un solo botón y el modal reparte los cortes elegidos entre
 * las entradas pendientes del grupo.
 */

/** Compra con al menos una cortesía pendiente: se muestra como en el listado del garzón. */
interface GrupoPendiente {
  id: string;
  dia: GrupoEntrada;
  filas: EntradaPendiente[];
}

const pad = (n: number) => String(n).padStart(2, '0');

function fechaHoraLocal() {
  const ahora = new Date();
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export function CortesiasScreen() {
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const router = useRouter();

  const topeCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000),
  );

  const [pendientes, setPendientes] = useState<EntradaPendiente[]>([]);
  const [entradasDia, setEntradasDia] = useState<EntradaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grupoEntrega, setGrupoEntrega] = useState<GrupoPendiente | null>(null);
  const [grupoAnular, setGrupoAnular] = useState<GrupoPendiente | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);

  const { fecha } = fechaHoraLocal();

  const totalPendiente = useMemo(
    () => pendientes.reduce((suma, fila) => suma + Number(fila.monto_entrada), 0),
    [pendientes],
  );

  // Una fila por compra, con los mismos datos que el listado del garzón. Si el
  // listado del día no cargó, se arma con lo que trae la cola.
  const gruposPendientes = useMemo<GrupoPendiente[]>(() => {
    const porGrupo = new Map<string, EntradaPendiente[]>();
    for (const fila of pendientes) {
      const clave = fila.grupo_registro_id ?? fila.id;
      const actual = porGrupo.get(clave);
      if (actual) actual.push(fila);
      else porGrupo.set(clave, [fila]);
    }

    const diaPorGrupo = new Map(agruparEntradas(entradasDia).map(grupo => [grupo.id, grupo]));
    return Array.from(porGrupo.entries()).map(([clave, filas]) => ({
      id: clave,
      dia:
        diaPorGrupo.get(clave) ?? {
          id: clave,
          cliente: filas[0].cliente_nombre || 'Cliente sin nombre',
          cantidad: filas.length,
          costoUnitario: Number(filas[0].monto_entrada),
          total: filas.reduce((suma, fila) => suma + Number(fila.monto_entrada), 0),
          metodo: filas[0].metodo_pago,
          adicional: 0,
          entregadas: 0,
          anuladas: 0,
          baucherEntradaId: null,
        },
      filas,
    }));
  }, [pendientes, entradasDia]);

  const cargar = useCallback(
    async (mostrarLoading = false) => {
      if (mostrarLoading) setLoading(true);
      try {
        // La cola es la del día de negocio, igual que en el dashboard: el
        // servidor no la limita a una caja y entregar no exige caja abierta.
        const [res, listado] = await Promise.all([
          entradasService.pendientes(fecha),
          entradasService.listar(fecha),
        ]);
        if (!res.success) {
          throw new Error(res.message || 'No se pudo cargar la cola de cortesías');
        }
        setPendientes(res.data ?? []);
        // El listado es de consulta: si falla, la entrega sigue disponible.
        setEntradasDia(listado.success ? (listado.data ?? []) : []);
        if (!listado.success) {
          logger.fetchError(
            new Error(listado.message || 'No se pudo cargar el listado de entradas'),
            { context: 'Cortesias:listado' },
          );
        }
      } catch (error) {
        logger.fetchError(error, { context: 'Cortesias:cargar' });
        showToast({
          type: 'error',
          text1: 'No se pudo cargar la cola',
          text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
        });
      } finally {
        if (mostrarLoading) setLoading(false);
      }
    },
    [fecha],
  );

  useFocusEffect(
    useCallback(() => {
      void cargar(true);
    }, [cargar]),
  );

  // El garzón registra entradas en la puerta mientras la cola está abierta: se
  // refresca al recibir el aviso en vivo, sin esperar a que la pantalla reciba
  // el foco.
  useEffect(() => {
    const subscription = eventBus.addListener(
      REALTIME_EVENT_NAMES.refreshEntradas,
      () => {
        void cargar();
      },
    );
    return () => subscription.remove();
  }, [cargar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  }, [cargar]);

  /**
   * Anula todas las entradas pendientes de la compra, como el dashboard: una
   * persona que se fue no recibe su bebida, pero el monto cobrado en la puerta
   * queda posteado a la caja. El servidor anula una fila por llamada.
   */
  const anularPendientes = useCallback(
    async (grupo: GrupoPendiente) => {
      setGrupoAnular(null);
      setAnulandoId(grupo.id);
      let anuladas = 0;
      try {
        for (const fila of grupo.filas) {
          const res = await entradasService.anular(fila.id);
          if (!res.success) throw new Error(res.message || 'No se pudo anular la entrada');
          anuladas += 1;
        }
        showToast({
          type: 'success',
          text1: anuladas === 1 ? 'Entrada anulada' : `${anuladas} entradas anuladas`,
          text2: grupo.dia.cliente,
        });
      } catch (error) {
        logger.fetchError(error, { context: 'Cortesias:anular' });
        showToast({
          type: 'error',
          text1: 'No se pudieron anular las entradas',
          text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
        });
      } finally {
        if (anuladas > 0) await cargar();
        setAnulandoId(null);
      }
    },
    [cargar],
  );

  const abrirEntrega = useCallback((grupo: GrupoPendiente) => {
    setGrupoEntrega(grupo);
  }, []);

  const cerrarEntrega = useCallback(() => {
    setGrupoEntrega(null);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <PremiumHeader
          title="Cortesías"
          subtitle="Entregas de la barra"
          rightComponent={
            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          }
        />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Cortesías"
        subtitle="Entregas de la barra"
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextHeader}>Atrás</Text>
          </Pressable>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        <View style={{ padding: 20 }}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.listHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                  PENDIENTES DEL DÍA
                </Text>
                <Text style={[styles.totalValue, { color: textPrimary }]}>
                  {formatCurrency(totalPendiente)}
                </Text>
              </View>
              <Text style={{ color: textSecondary, fontSize: 12 }}>
                {gruposPendientes.length}{' '}
                {gruposPendientes.length === 1 ? 'compra' : 'compras'}
              </Text>
            </View>

            {pendientes.length === 0 && (
              <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center' }}>
                Sin cortesías pendientes por ahora.
              </Text>
            )}

            {gruposPendientes.map(grupo => {
              const estado = estadoDelGrupo(grupo.dia);
              const multiple = grupo.filas.length > 1;
              const abierto = grupoAbierto === grupo.id;
              return (
                <View key={grupo.id} style={[styles.grupoRow, { borderColor }]}>
                  <View style={styles.grupoFilaSuperior}>
                    <Pressable
                      onPress={() => {
                        if (multiple) {
                          setGrupoAbierto(actual => (actual === grupo.id ? null : grupo.id));
                          return;
                        }
                        abrirEntrega(grupo);
                      }}
                      style={styles.grupoHeader}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}
                          numberOfLines={1}
                        >
                          {grupo.dia.cliente}
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 11 }}>
                          {grupo.dia.cantidad}{' '}
                          {grupo.dia.cantidad === 1 ? 'entrada' : 'entradas'} ·{' '}
                          {formatCurrency(grupo.dia.costoUnitario)} c/u · {grupo.dia.metodo}
                        </Text>
                        {multiple && (
                          <Text style={{ color: textSecondary, fontSize: 11 }}>
                            {grupo.filas.length} sin entregar
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                          {formatCurrency(grupo.dia.total)}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: `${estado.color}1F` }]}>
                          <Text style={{ color: estado.color, fontSize: 10, fontWeight: '800' }}>
                            {estado.label}
                          </Text>
                        </View>
                      </View>
                      {multiple && (
                        <Ionicons
                          name={abierto ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={textSecondary}
                        />
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => abrirEntrega(grupo)}
                      style={({ pressed }) => [
                        styles.entregarBtn,
                        { backgroundColor: `${accentColor}1F`, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={{ color: accentColor, fontWeight: '800', fontSize: 11 }}>
                        {multiple ? `ENTREGAR ${grupo.filas.length}` : 'ENTREGAR'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setGrupoAnular(grupo)}
                      disabled={anulandoId === grupo.id}
                      style={({ pressed }) => [
                        styles.anularBtn,
                        { opacity: anulandoId === grupo.id ? 0.5 : pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        grupo.filas.length === 1
                          ? 'Anular entrada pendiente'
                          : `Anular ${grupo.filas.length} entradas pendientes`
                      }
                    >
                      {anulandoId === grupo.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={styles.anularText}>
                          {grupo.filas.length > 1 ? `ANULAR ${grupo.filas.length}` : 'ANULAR'}
                        </Text>
                      )}
                    </Pressable>
                  </View>

                  {multiple &&
                    abierto &&
                    grupo.filas.map(fila => (
                      <View key={fila.id} style={styles.subFila}>
                        <Text style={{ flex: 1, color: textSecondary, fontSize: 11 }}>
                          {fila.hora} · {formatCurrency(fila.monto_entrada)}
                        </Text>
                      </View>
                    ))}
                </View>
              );
            })}
          </View>

          <View style={{ marginTop: 20 }}>
            <EntradasListadoCard
              entradas={entradasDia}
              titulo={`HOY · ${fecha.split('-').reverse().join('/')}`}
              vacio="Sin entradas registradas hoy."
            />
          </View>
        </View>
      </ScrollView>

      <PremiumAlert
        visible={grupoAnular !== null}
        type="danger"
        title={grupoAnular && grupoAnular.filas.length > 1 ? 'Anular entradas' : 'Anular entrada'}
        message={
          grupoAnular
            ? grupoAnular.filas.length === 1
              ? '¿Anular la entrada pendiente de este grupo? El monto se registrará como entrada en la caja.'
              : `¿Anular las ${grupoAnular.filas.length} entradas pendientes de este grupo? El monto se registrará como entrada en la caja.`
            : ''
        }
        confirmText="Anular"
        cancelText="Cancelar"
        showCancel
        onConfirm={() => {
          if (grupoAnular) void anularPendientes(grupoAnular);
        }}
        onCancel={() => setGrupoAnular(null)}
      />

      <EntregaCortesiasModal
        key={grupoEntrega?.id ?? 'cerrado'}
        visible={grupoEntrega !== null}
        grupo={
          grupoEntrega
            ? {
                id: grupoEntrega.id,
                cliente: grupoEntrega.dia.cliente,
                filas: grupoEntrega.filas,
              }
            : null
        }
        tope={topeCortesia}
        onClose={cerrarEntrega}
        onEntregado={cargar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  backTextHeader: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  card: { borderRadius: 28, padding: 20, borderWidth: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  totalValue: { fontSize: 22, fontWeight: '900' },
  grupoRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  grupoFilaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  grupoHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingTop: 8,
    paddingLeft: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  entregarBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  anularBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  anularText: { color: '#EF4444', fontWeight: '800', fontSize: 10 },
  
});
