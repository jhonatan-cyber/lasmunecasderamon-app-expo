import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { ColacionWorkerModal } from '@/components/colaciones/ColacionWorkerModal';
import { ColacionProductsCarousel } from '@/components/colaciones/ColacionProductsCarousel';
import { ColacionAcompanamientoSelector } from '@/components/colaciones/ColacionAcompanamientoSelector';
import { useColacionesScreen } from '@/hooks/useColacionesScreen';
import { showToast } from '@/utils/toast-lazy';
import { isCajeroRole } from '@/utils/userRole';
import { useAuthStore } from '@/store/authStore';

const ROLE_LABELS: Record<string, string> = {
  anfitriona: 'Anfitriona',
  cajero: 'Cajero',
  garzon: 'Garzón',
  barman: 'Barman',
};
const normalizeRole = (role?: string | null) => (role ?? '').trim().toLowerCase();
const roleName = (role: string) => ROLE_LABELS[role] ?? (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Sin rol');

export default function ColacionesScreen() {
  const router = useRouter();
  const {
    accentColor,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
    rule,
    ruleLoading,
    ruleError,
    productos,
    productosLoading,
    productosError,
    analcoholicas,
    analcoholicasLoading,
    analcoholicasError,
    trabajadores,
    trabajadoresLoading,
    trabajadoresError,
    acompanamientos,
    acompanamientosLoading,
    acompanamientosError,
    registros,
    registrosLoading,
    registrosError,
    saving,
    workerId,
    productoId,
    acompanamientoId,
    setSelectedWorker,
    setSelectedProducto,
    setSelectedAcompanamiento,
    registrar,
    cajaAbierta,
    cajaInfo,
    selectedWorker,
    ruleFromWorker,
    catalogoVisible,
    productoSeleccionado,
    opcionBotella,
    requiereAcompanamiento,
    mlPorRegistrar,
    selectedAcompanamiento,
    cargarReglas,
    cargarCatalogos,
    cargarTrabajadores,
    cargarRegistros,
    isCajaAbierta,
  } = useColacionesScreen();

  const [workerModalVisible, setWorkerModalVisible] = useState(false);
  const [historyRole, setHistoryRole] = useState<string | null>(null);
  const historyRoles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of registros) {
      const role = normalizeRole(row.rol);
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    // El servidor fija el orden de roles, sin duplicar las reglas del catálogo.
    const roleOrder = Object.keys(rule?.roles ?? ROLE_LABELS);
    const position = (role: string) => {
      const index = roleOrder.indexOf(role);
      return index < 0 ? roleOrder.length : index;
    };
    return [...counts.entries()]
      .sort(([a], [b]) => position(a) - position(b) || a.localeCompare(b, 'es'))
      .map(([role, count]) => ({ role, count }));
  }, [registros, rule]);
  const activeHistoryRole = historyRoles.some(option => option.role === historyRole) ? historyRole : null;
  const filteredHistory = useMemo(() => activeHistoryRole === null
    ? registros
    : registros.filter(row => normalizeRole(row.rol) === activeHistoryRole), [registros, activeHistoryRole]);

  const user = useAuthStore(state => state.user);
  const roleLabel = isCajeroRole(user) ? 'cajero' : 'barman';

  const handleRefresh = useCallback(async () => {
    await Promise.all([cargarReglas(), cargarCatalogos(), cargarTrabajadores(), cargarRegistros()]);
  }, [cargarReglas, cargarCatalogos, cargarTrabajadores, cargarRegistros]);

  const handleSelectWorker = useCallback((id: string) => {
    setSelectedWorker(id);
    setWorkerModalVisible(false);
  }, [setSelectedWorker]);

  const handleSelectProducto = useCallback((id: string) => {
    setSelectedProducto(id);
  }, [setSelectedProducto]);

  const acompanamientoRenderer = useMemo(() => {
    if (!requiereAcompanamiento || !productoId) return null;
    return (
      <ColacionAcompanamientoSelector
        acompanamientos={acompanamientos}
        selectedId={acompanamientoId}
        loading={acompanamientosLoading}
        error={acompanamientosError}
        onSelect={setSelectedAcompanamiento}
      />
    );
  }, [requiereAcompanamiento, productoId, acompanamientos, acompanamientoId, acompanamientosLoading, acompanamientosError, setSelectedAcompanamiento]);

  const canRegister = useMemo(() => {
    if (!isCajaAbierta) return false;
    if (saving) return false;
    if (!workerId) return false;
    if (!ruleFromWorker) return false;
    if (!productoSeleccionado) return false;
    if (!rule) return false;
    if (requiereAcompanamiento && !selectedAcompanamiento) return false;
    return true;
  }, [isCajaAbierta, saving, workerId, ruleFromWorker, productoSeleccionado, rule, requiereAcompanamiento, selectedAcompanamiento]);

  const hasAnyCatalogoError = useMemo(() => {
    if (productosLoading || analcoholicasLoading || trabajadoresLoading) return false;
    if (productosError || analcoholicasError || trabajadoresError) return productosError || analcoholicasError || trabajadoresError;
    return null;
  }, [productosLoading, analcoholicasLoading, trabajadoresLoading, productosError, analcoholicasError, trabajadoresError]);

  const handleAbrirModalTrabajador = useCallback(() => {
    setWorkerModalVisible(true);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Colaciones"
        subtitle="Un corto por trabajador durante el turno"
        onBack={() => router.back()}
        rightComponent={
          <View style={[styles.brandRow, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.brandText, { color: '#FFFFFF' }]}>{roleLabel}</Text>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={productosLoading || trabajadoresLoading || registrosLoading} onRefresh={handleRefresh} tintColor={accentColor} />
        }
      >
        <View style={[styles.alert, { borderColor }]}>
          {!cajaAbierta ? (
            <Text style={[styles.alertText, { color: accentColor }]}>
              Se requiere una caja abierta para registrar una colación.
            </Text>
          ) : ruleError || hasAnyCatalogoError ? (
            <Text style={[styles.alertText, { color: '#EF4444' }]}>
              Ocurrió un error cargando los datos: {ruleError || hasAnyCatalogoError}
            </Text>
          ) : null}
        </View>

        <View style={[styles.registerCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.registerCardHeader}>
            <Ionicons name="beer-outline" size={20} color={accentColor} />
            <View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Registrar colación</Text>
              <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
                Un trabajador, un corto por turno.
              </Text>
            </View>
          </View>

          <View style={[styles.errorBox, { borderBottomColor: borderColor }]}>
            {productosError || analcoholicasError || trabajadoresError ? (
              <Text style={[styles.error, { color: '#EF4444' }]}>
                {productosError || analcoholicasError || trabajadoresError}
              </Text>
            ) : null}
          </View>

          <View style={styles.selectorsRow}>
            <View style={[styles.selectorBlock, { backgroundColor: '#F9FAFB', borderColor }]}>
              <Text style={[styles.label, { color: textPrimary }]}>Trabajador</Text>
              <Pressable
                onPress={handleAbrirModalTrabajador}
                style={[styles.selectButton, { borderColor }]}
                disabled={trabajadoresLoading || trabajadores.length === 0}
              >
                <Text style={[styles.selectButtonText, { color: trabajadoresLoading || trabajadores.length === 0 ? textSecondary : textPrimary }]}>
                  {trabajadoresLoading ? 'Cargando…' : selectedWorker ? `${selectedWorker.name} ${selectedWorker.lastName}${selectedWorker.nick ? ` · ${selectedWorker.nick}` : ''}` : 'Selecciona un trabajador'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.selectorBlock, { backgroundColor: '#F9FAFB', borderColor }]}>
              <Text style={[styles.label, { color: textPrimary }]}>Bebida</Text>
              <Pressable
                onPress={() => {}}
                style={[styles.selectButton, { borderColor }]}
                disabled={!catalogoVisible.length || productosLoading || analcoholicasLoading}
              >
                <Text style={[styles.selectButtonText, { color: !catalogoVisible.length || productosLoading || analcoholicasLoading ? textSecondary : textPrimary }]}>
                  {productoSeleccionado ? `${productoSeleccionado.producto_nombre} ${productoSeleccionado.presentacion_nombre}` : 'Selecciona una bebida'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={textSecondary} />
              </Pressable>
            </View>
          </View>

          {catalogoVisible.length > 0 && (
            <View style={styles.productsCarousel}>
              <ColacionProductsCarousel
                products={catalogoVisible}
                selectedId={productoId}
                loading={productosLoading || analcoholicasLoading}
                onSelect={handleSelectProducto}
              />
            </View>
          )}

          {acompanamientoRenderer}

          <View style={styles.datasetosRow}>
            {productoSeleccionado && (
              <View style={styles.datasetoItem}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '500' }}>Producto</Text>
                <Text style={[styles.datasetoValue, { color: textPrimary }]}>
                  {Number(productoSeleccionado.ml_botella ?? 0) > 0
                    ? `${Number(productoSeleccionado.ml_botella)} ml`
                    : 'Sin ml'}
                </Text>
              </View>
            )}
            {productoSeleccionado && (
              <View style={styles.datasetoItem}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '500' }}>Colación</Text>
                <Text style={[styles.datasetoValue, { color: textPrimary }]}>
                  {opcionBotella ? `${mlPorRegistrar} ml` : 'Sin configurar'}
                </Text>
              </View>
            )}
          </View>

          {productoSeleccionado && Number(productoSeleccionado.ml_abierta ?? 0) > 0 ? (
            <Text style={[styles.mlAbierto, { color: textSecondary }]}>
              Quedan {Number(productoSeleccionado.ml_abierta)} ml en la botella abierta.
            </Text>
          ) : null}

          <Text style={[styles.helpText, { color: textSecondary }]}>
            {ruleFromWorker?.catalogo === 'productos'
              ? 'La anfitriona recibe los productos habilitados para colación.'
              : 'Este rol recibe bebidas analcohólicas habilitadas para colación.'}
          </Text>

          <View style={styles.actionsRow}>
            <View style={styles.registerButtonWrap}>
              <Pressable
                onPress={registrar}
                style={[
                  styles.registerButton,
                  {
                    backgroundColor: canRegister ? accentColor : 'transparent',
                  },
                ]}
                disabled={!canRegister}
              >
                {saving ? (
                  <Ionicons name="sync" size={18} color="#FFFFFF" />
                ) : (
                  <Ionicons name="receipt" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.registerButtonText}>
                  {saving ? 'Guardando…' : 'Registrar corto'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.listCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.listCardHeader}>
            <Text style={[styles.listTitle, { color: textPrimary }]}>
              Colaciones del turno
            </Text>
            <Text style={[styles.listCount, { color: textSecondary }]}>
              {filteredHistory.length} registrado{(filteredHistory.length === 1 ? '' : 's')}
            </Text>
          </View>

          {!registrosLoading && !registrosError && historyRoles.length > 0 ? (
            <View accessibilityLabel="Filtrar colaciones por rol" style={styles.roleFilters}>
              {[{ role: null, count: registros.length }, ...historyRoles].map(option => (
                <Pressable
                  key={option.role ?? 'all'}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.role === null ? 'Todos' : roleName(option.role)}, ${option.count} ${option.count === 1 ? 'colación' : 'colaciones'}`}
                  accessibilityState={{ selected: activeHistoryRole === option.role }}
                  onPress={() => setHistoryRole(option.role)}
                  style={[styles.roleFilter, { borderColor: activeHistoryRole === option.role ? accentColor : borderColor }]}
                >
                  <Text style={[styles.roleFilterText, { color: textPrimary }]}>
                    {option.role === null ? 'Todos' : roleName(option.role)} · {option.count}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {registrosLoading ? (
            <View style={styles.loadingRow}>
              <Ionicons name="sync" size={18} color={textSecondary} />
              <Text style={{ color: textSecondary, marginLeft: 4 }}>Cargando colaciones…</Text>
            </View>
          ) : registrosError ? (
            <Text style={[styles.error, { color: '#EF4444' }]}>{registrosError}</Text>
          ) : filteredHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              Aún no hay colaciones en este turno.
            </Text>          ) : (
            filteredHistory.map((row) => (
              <View key={String(row.id)} style={[styles.row, { borderBottomColor: borderColor }]}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowWorker, { color: textPrimary }]}>
                    {row.usuario_nombre ?? row.registrado_por_nombre}
                    {row.nick ? ` (${row.nick})` : ''}
                  </Text>
                  <Text style={[styles.rowDrink, { color: textSecondary }]}>
                    {row.producto_nombre ?? 'Corto'}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowMl, { color: textPrimary }]}>{row.ml_bebida ?? 0} ml</Text>
                  <Text style={[styles.rowBy, { color: textSecondary }]}>
                    {row.registrado_por_nombre}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ColacionWorkerModal
        visible={workerModalVisible}
        onClose={() => setWorkerModalVisible(false)}
        workers={trabajadores.filter((t) => t.id !== workerId)}
        selectedId={workerId ?? null}
        onSelect={handleSelectWorker}
        error={trabajadoresError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 24,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  alert: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'flex-start',
    gap: 4,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  registerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  registerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  errorBox: {
    minHeight: 16,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectorsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  selectorBlock: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  productsCarousel: {
    marginTop: 4,
  },
  datasetosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  datasetoItem: {
    flex: 1,
    gap: 2,
  },
  datasetoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  mlAbierto: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },
  actionsRow: {
    marginTop: 4,
  },
  registerButtonWrap: {
    width: '100%',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  roleFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleFilter: { minHeight: 44, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderRadius: 10 },
  roleFilterText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowWorker: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowDrink: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowMl: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowBy: {
    fontSize: 12,
    fontWeight: '500',
  },
  brandRow: {
    height: 38,
    borderRadius: 9999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginRight: 12,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

