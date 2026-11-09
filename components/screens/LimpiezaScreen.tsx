import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { limpiezaService, type OperacionLimpieza, type AccesoLimpieza } from '@/services/limpieza';
import { showToast } from '@/utils/toast-lazy';
import { isBarmanRole } from '@/utils/userRole';

const UBICACIONES: Array<'almacen' | 'bar' | 'caja' | 'local'> = ['almacen', 'bar', 'caja', 'local'];
const NOMBRES_UBICACION: Record<string, string> = {
  almacen: 'Almacén',
  bar: 'Bar',
  caja: 'Caja',
  local: 'Local',
};

export default function LimpiezaScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const caja = useCajaAbierta();

  const [resumen, setResumen] = useState<{
    articulos: Array<{
      id: string;
      nombre: string;
      unidad: string;
      minimo: number;
      stock: Record<string, number>;
      en_transito: number;
    }>;
    movimientos: Array<{
      id: string;
      articulo: string;
      unidad: string;
      tipo: 'ingreso' | 'traspaso' | 'consumo';
      cantidad: number;
      origen: string | null;
      destino: string | null;
      estado: 'pendiente' | 'aceptado' | 'rechazado';
      nota: string;
      creador_nombre?: string;
      receptor_nombre?: string | null;
      fecha: string;
    }>;
    acceso: AccesoLimpieza;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticuloId, setSelectedArticuloId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [nota, setNota] = useState('');
  const [origen, setOrigen] = useState<string>('bar');
  const [destino, setDestino] = useState<string>('almacen');
  const [tipoOperacion, setTipoOperacion] = useState<'consumo' | 'traspaso'>('consumo');
  const [saving, setSaving] = useState(false);

  const acceso = useMemo(() => resumen?.acceso ?? { gestionar: false, ubicaciones: ['bar'] }, [resumen]);

  const articuloSeleccionado = useMemo(() =>
    resumen?.articulos.find(a => a.id === selectedArticuloId) ?? null,
    [resumen, selectedArticuloId]
  );

  const ubicacionesPermitidas = useMemo(() => acceso.ubicaciones.length > 0 ? acceso.ubicaciones : ['bar'], [acceso]);

  useEffect(() => {
    if (!acceso.gestionar && ubicacionesPermitidas.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrigen(ubicacionesPermitidas[0]);
      if (tipoOperacion === 'traspaso') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDestino(ubicacionesPermitidas.length > 1 ? ubicacionesPermitidas[1] : 'almacen');
      }
    }
  }, [acceso, ubicacionesPermitidas, tipoOperacion]);

  // eslint-disable react-hooks/set-state-in-effect
  const cargar = useCallback(async () => {
    try {
      const res = await limpiezaService.refresh();
      if (res) {
        setResumen(res);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, []);
  // eslint-enable react-hooks/set-state-in-effect

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* eslint-disable react-hooks/set-state-in-effect */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
    // eslint-disable-line react-hooks/set-state-in-effect
  }, [cargar]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const pendientes = useMemo(() =>
    (resumen?.movimientos ?? []).filter(m => m.estado === 'pendiente'),
    [resumen]
  );

  const bajas = useMemo(() =>
    (resumen?.articulos ?? []).filter(a => a.stock.caja !== undefined && a.stock.caja <= Number(a.minimo))
      .concat((resumen?.articulos ?? []).filter(a => a.stock.bar !== undefined && a.stock.bar <= Number(a.minimo)))
    ,
    [resumen]
  );

  const handleOperacion = useCallback(async () => {
    if (!selectedArticuloId || !cantidad) {
      showToast({ type: 'error', text1: 'Selecciona artículo y cantidad' });
      return;
    }
    if (tipoOperacion === 'consumo' && !nota.trim()) {
      showToast({ type: 'error', text1: 'Agrega un detalle del consumo' });
      return;
    }
    setSaving(true);
    try {
      const op: OperacionLimpieza = tipoOperacion === 'consumo' ? {
        tipo: 'consumo',
        articulo_id: selectedArticuloId,
        cantidad: Number(cantidad),
        origen: origen as any,
        nota: nota.trim(),
      } : {
        tipo: 'traspaso',
        articulo_id: selectedArticuloId,
        cantidad: Number(cantidad),
        origen: origen as any,
        destino: destino as any,
        nota: nota.trim() || undefined,
      };
      await limpiezaService.operate(op);
      setCantidad('');
      setNota('');
      await cargar();
    } catch (err) {
      showToast({
        type: 'error',
        text1: 'No se pudo registrar',
        text2: err instanceof Error ? err.message : 'Intenta de nuevo',
      });
    } finally {
      setSaving(false);
    }
  }, [selectedArticuloId, cantidad, nota, origen, destino, tipoOperacion, cargar]);

  const roleLabel = useMemo(() => isBarmanRole({ role: 'barman' }) ? 'Barman' : 'Cajero', []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <PremiumHeader
          title="Limpieza"
          subtitle="Surtidos por turno"
          rightComponent={
            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          }
        />
        <View style={styles.loadingBox}>
          <Ionicons name="sync" size={24} color={accentColor} />
          <Text style={{ color: textSecondary, marginTop: 8 }}>Cargando inventario...</Text>
        </View>
      </View>
    );
  }

  const canRegister = caja.cajaAbierta && !saving && selectedArticuloId && cantidad;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Limpieza"
        subtitle="Surtidos por turno"
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        <View style={{ padding: 20 }}>
          {/* Resumen */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>RESUMEN</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={{ color: textSecondary, fontSize: 12 }}>Artículos</Text>
                <Text style={[styles.summaryValue, { color: textPrimary }]}>{resumen?.articulos.length ?? 0}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={{ color: textSecondary, fontSize: 12 }}>Pendientes</Text>
                <Text style={[styles.summaryValue, { color: textPrimary }]}>{pendientes.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={{ color: textSecondary, fontSize: 12 }}>Bajas</Text>
                <Text style={[styles.summaryValue, { color: textPrimary }]}>{bajas.length}</Text>
              </View>
            </View>
          </View>

          {/* Operación */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Registrar operación</Text>

            <View style={styles.opTypeRow}>
              <Pressable
                onPress={() => setTipoOperacion('consumo')}
                style={[
                  styles.opTypeBtn,
                  { borderColor },
                  tipoOperacion === 'consumo' && { backgroundColor: `${accentColor}15` },
                ]}
              >
                <Ionicons
                  name={tipoOperacion === 'consumo' ? 'checkmark' : 'radio-button-off'}
                  size={16}
                  color={tipoOperacion === 'consumo' ? accentColor : textSecondary}
                />
                <Text style={{ color: tipoOperacion === 'consumo' ? textPrimary : textSecondary, marginLeft: 6 }}>
                  Consumo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTipoOperacion('traspaso')}
                style={[
                  styles.opTypeBtn,
                  { borderColor },
                  tipoOperacion === 'traspaso' && { backgroundColor: `${accentColor}15` },
                ]}
              >
                <Ionicons
                  name={tipoOperacion === 'traspaso' ? 'checkmark' : 'radio-button-off'}
                  size={16}
                  color={tipoOperacion === 'traspaso' ? accentColor : textSecondary}
                />
                <Text style={{ color: tipoOperacion === 'traspaso' ? textPrimary : textSecondary, marginLeft: 6 }}>
                  Traspaso
                </Text>
              </Pressable>
            </View>

            <View style={[styles.formGroup, { borderColor }]}>
              <Text style={[styles.label, { color: textPrimary }]}>Artículo</Text>
              <View style={[styles.inputBox, { borderColor }]}>
                <Text style={{ color: selectedArticuloId ? textPrimary : textSecondary }}>
                  {articuloSeleccionado
                    ? `${articuloSeleccionado.nombre} (${articuloSeleccionado.unidad})`
                    : 'Selecciona un artículo'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={textSecondary} />
              </View>
            </View>

            {tipoOperacion === 'consumo' && (
              <>
                <View style={[styles.formGroup, { borderColor }]}>
                  <Text style={[styles.label, { color: textPrimary }]}>Origen</Text>
                  <View style={[styles.inputBox, { borderColor }]}>
                    <Text style={{ color: textPrimary }}>{NOMBRES_UBICACION[origen] || origen}</Text>
                  </View>
                </View>

                <View style={[styles.formGroup, { borderColor }]}>
                  <Text style={[styles.label, { color: textPrimary }]}>Cantidad</Text>
                  <View style={[styles.inputBox, { borderColor }]}>
                    <Text style={{ color: textPrimary }}>{cantidad || '0'} {articuloSeleccionado?.unidad || ''}</Text>
                  </View>
                </View>

                <View style={[styles.formGroup, { borderColor }]}>
                  <Text style={[styles.label, { color: textPrimary }]}>Detalle</Text>
                  <View style={[styles.inputBox, { borderColor }]}>
                    <Text style={{ color: nota ? textPrimary : textSecondary }}>
                      {nota || 'Ej: Limpieza de baños'}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {tipoOperacion === 'traspaso' && (
              <>
                <View style={[styles.formGroup, { borderColor }]}>
                  <Text style={[styles.label, { color: textPrimary }]}>Origen</Text>
                  <Pressable
                    onPress={() => {}}
                    style={[styles.inputBox, { borderColor }]}
                  >
                    <Text style={{ color: textPrimary }}>{NOMBRES_UBICACION[origen] || origen}</Text>
                    <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                  </Pressable>
                </View>

                <View style={[styles.formGroup, { borderColor }]}>
                  <Text style={[styles.label, { color: textPrimary }]}>Destino</Text>
                  <Pressable
                    onPress={() => {}}
                    style={[styles.inputBox, { borderColor }]}
                  >
                    <Text style={{ color: textPrimary }}>{NOMBRES_UBICACION[destino] || destino}</Text>
                    <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                  </Pressable>
                </View>

                <View style={[styles.formGroup, { borderColor }]}>
                  <Text style={[styles.label, { color: textPrimary }]}>Cantidad</Text>
                  <View style={[styles.inputBox, { borderColor }]}>
                    <Text style={{ color: textPrimary }}>{cantidad || '0'} {articuloSeleccionado?.unidad || ''}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Lista de artículos */}
          {resumen && resumen.articulos.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Artículos</Text>
              {resumen.articulos.map(articulo => (
                <Pressable
                  key={articulo.id}
                  onPress={() => setSelectedArticuloId(articulo.id)}
                  style={[
                    styles.articuloRow,
                    { borderColor },
                    selectedArticuloId === articulo.id && { backgroundColor: `${accentColor}10` },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textPrimary, fontWeight: '600' }}>{articulo.nombre}</Text>
                    <Text style={{ color: textSecondary, fontSize: 12 }}>
                      {articulo.unidad} · Mín: {articulo.minimo}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {articulo.stock.bar !== undefined && (
                      <Text style={{ color: articulo.stock.bar <= articulo.minimo ? '#EF4444' : textSecondary, fontSize: 12 }}>
                        Bar: {articulo.stock.bar}
                      </Text>
                    )}
                    {articulo.stock.caja !== undefined && (
                      <Text style={{ color: articulo.stock.caja <= articulo.minimo ? '#EF4444' : textSecondary, fontSize: 12 }}>
                        Caja: {articulo.stock.caja}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Pendientes */}
          {pendientes.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Pendientes</Text>
              {pendientes.map(mov => (
                <View key={mov.id} style={[styles.movRow, { borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textPrimary, fontWeight: '600' }}>
                      {mov.articulo} · {mov.cantidad} {mov.unidad}
                    </Text>
                    <Text style={{ color: textSecondary, fontSize: 12 }}>
                      {NOMBRES_UBICACION[mov.origen || ''] || ''} → {NOMBRES_UBICACION[mov.destino || ''] || ''}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                    {new Date(mov.fecha).toLocaleDateString('es-CL')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botón registrar */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleOperacion}
          style={[
            styles.registerBtn,
            {
              backgroundColor: canRegister ? accentColor : 'rgba(0,0,0,0.1)',
              borderColor: canRegister ? accentColor : borderColor,
            },
          ]}
          disabled={!canRegister}
        >
          <Text style={styles.registerBtnText}>
            {saving ? 'Guardando...' : 'Registrar'}
          </Text>
        </Pressable>
      </View>
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
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  opTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  opTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  formGroup: {
    marginBottom: 12,
    gap: 6,
  },
  label: { fontSize: 12, fontWeight: '700' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  articuloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  movRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,      backgroundColor: '#000000',
      borderTopWidth: 1,
    },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
