import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { ColacionProductsCarousel } from '@/components/colaciones/ColacionProductsCarousel';
import { ColacionAcompanamientoSelector } from '@/components/colaciones/ColacionAcompanamientoSelector';
import { ColacionHistoryCard } from '@/components/colaciones/ColacionHistoryCard';
import { ColacionWorkerModal } from '@/components/colaciones/ColacionWorkerModal';
import { useColacionesScreen } from '@/hooks/useColacionesScreen';
import { nombreRolLegible } from '@/utils/userRole';
import { useAccentColor } from '@/hooks/useAccentColor';

/** Filtro que muestra el turno completo. */
const ROL_TODOS = 'Todos';


/** Color según la categoría del producto para el card de ml. */
function colorDeCategoria(nombre?: string | null): string {
  const n = (nombre ?? '').toLowerCase();
  if (n.includes('whisky') || n.includes('whisk')) return '#F59E0B';
  if (n.includes('ron') || n.includes('rum')) return '#B45309';
  if (n.includes('vino')) return '#DC2626';
  if (n.includes('cerveza') || n.includes('beer')) return '#D97706';
  if (n.includes('tequila')) return '#EF4444';
  if (n.includes('vodka')) return '#60A5FA';
  if (n.includes('ginebra') || n.includes('gin')) return '#10B981';
  if (n.includes('mezcla') || n.includes('mixer') || n.includes('refresco')) return '#3B82F6';
  if (n.includes('coctel') || n.includes('cocktail')) return '#F97316';
  if (n.includes('licor')) return '#A855F7';
  if (n.includes('aguardiente')) return '#84CC16';
  if (n.includes('cafe') || n.includes('coffee')) return '#92400E';
  if (n.includes('jugo') || n.includes('juice')) return '#F97316';
  if (n.includes('agua')) return '#0EA5E9';
  if (n.includes('postre') || n.includes('dessert')) return '#F59E0B';
  if (n.includes('snack') || n.includes('botana')) return '#F59E0B';
  return '#6B7280';
}

export default function ColacionesScreen() {
    const { accentOnSurface, accentText } = useAccentColor();
  const router = useRouter();
  const {
    accentColor,
    bg,
    cardBg,
    surfaceMuted,
    textPrimary,
    textSecondary,
    borderColor,
    rule,
    productosLoading,
    productosError,
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
    selectedWorker,
    ruleFromWorker,
    catalogoVisible,
    productoSeleccionado,
    opcionBotella,
    acompanamientoConfigurado,
    requiereAcompanamiento,
    mlPorRegistrar,
    selectedAcompanamiento,
    recargar,
    isCajaAbierta,
  } = useColacionesScreen();

  const [workerModalVisible, setWorkerModalVisible] = useState(false);
  const [registerCardCollapsed, setRegisterCardCollapsed] = useState(false);
  const [historyRole, setHistoryRole] = useState(ROL_TODOS);
  // Roles del historial, ya normalizados: " Anfitriona " y "anfitriona" son la
  // misma pestaña. Se ordenan por cantidad y, a igual, alfabéticamente.
  const rolesHistorial = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const registro of registros) {
      const rol = nombreRolLegible(registro.rol);
      conteo.set(rol, (conteo.get(rol) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([rol, cantidad]) => ({ rol, cantidad }));
  }, [registros]);
  // Si un refresco se lleva el rol elegido, el filtro vuelve a "Todos" sin
  // tener que guardar nada: el rol efectivo se deriva del que sigue existiendo.
  const rolEfectivo =
    historyRole !== ROL_TODOS && rolesHistorial.some((r) => r.rol === historyRole)
      ? historyRole
      : ROL_TODOS;
  const filteredHistory = useMemo(() => {
    if (rolEfectivo === ROL_TODOS) return registros;
    return registros.filter(r => nombreRolLegible(r.rol) === rolEfectivo);
  }, [registros, rolEfectivo]);

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
        unidadesRequeridas={acompanamientoConfigurado.unidades}
        mlPorUnidad={acompanamientoConfigurado.ml}
        onSelect={setSelectedAcompanamiento}
      />
    );
  }, [requiereAcompanamiento, productoId, acompanamientos, acompanamientoId, acompanamientosLoading, acompanamientosError, acompanamientoConfigurado, setSelectedAcompanamiento]);

  const canRegister = useMemo(() => {
    if (!isCajaAbierta) return false;
    if (saving) return false;
    if (!workerId) return false;
    if (!ruleFromWorker) return false;
    if (!productoSeleccionado) return false;
    if (!rule) return false;
    if (mlPorRegistrar <= 0) return false;
    if (requiereAcompanamiento && !selectedAcompanamiento) return false;
    return true;
  }, [isCajaAbierta, saving, workerId, ruleFromWorker, productoSeleccionado, rule, mlPorRegistrar, requiereAcompanamiento, selectedAcompanamiento]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Colaciones"
        subtitle="Un corto por trabajador durante el turno"
        onBack={() => router.back()}
        showThemeToggle
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={productosLoading || trabajadoresLoading || registrosLoading} onRefresh={recargar} tintColor={accentColor} />
        }
      >
        <View style={[styles.registerCard, { backgroundColor: cardBg, borderColor }]} collapsable={false}>
          <Pressable onPress={() => setRegisterCardCollapsed(!registerCardCollapsed)} style={styles.registerCardHeader} accessibilityRole="button" accessibilityLabel={registerCardCollapsed ? 'Expandir registro de colación' : 'Colapsar registro de colación'} accessibilityState={{ expanded: !registerCardCollapsed }}>
            <Ionicons name="beer-outline" size={20} color={accentOnSurface} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Registrar colación</Text>
            </View>
            <Ionicons name={registerCardCollapsed ? "chevron-down" : "chevron-up"} size={20} color={accentOnSurface} />
          </Pressable>

          {!registerCardCollapsed && (
          <>
          <View style={[styles.errorBox, { borderBottomColor: borderColor }]}>
            {productosError || analcoholicasError || trabajadoresError ? (
              <Text style={[styles.error, { color: accentOnSurface }]}>
                {productosError || analcoholicasError || trabajadoresError}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => !trabajadoresLoading && trabajadores.length > 0 && setWorkerModalVisible(true)}
            style={[styles.selectButton, { borderColor, opacity: trabajadoresLoading || trabajadores.length === 0 ? 0.5 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar trabajador"
          >
            <Text
              style={[
                styles.selectButtonText,
                { color: selectedWorker ? textPrimary : textSecondary },
              ]}
            >
              {selectedWorker
                ? `${selectedWorker.name} ${selectedWorker.lastName}${selectedWorker.nick ? ` · ${selectedWorker.nick}` : ''}`
                : 'Selecciona un trabajador'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={textSecondary} />
          </Pressable>


          {acompanamientoRenderer}

          {(() => {
            const catColor = productoSeleccionado
              ? colorDeCategoria(productoSeleccionado.categoria_nombre ?? productoSeleccionado.categoria ?? productoSeleccionado.producto_categoria)
              : null;
            return (
              <View style={styles.mlSection}>
                <Text style={[styles.mlCardTitle, { color: catColor ?? textSecondary }]}>
                  Ml del producto seleccionado
                </Text>
                {productoSeleccionado ? (
                  <View style={styles.mlGrid}>
                    <Text style={[styles.mlLabel, { color: textSecondary }]}>Producto</Text>
                    <Text style={[styles.mlValue, { color: catColor ?? textPrimary }]}>
                      {Number(productoSeleccionado.ml_botella ?? 0) > 0
                        ? `${Number(productoSeleccionado.ml_botella)} ml`
                        : 'Sin ml'}
                    </Text>
                    <Text style={[styles.mlLabel, { color: textSecondary }]}>Colación</Text>
                    <Text style={[styles.mlValue, { color: catColor ?? textPrimary }]}>
                      {opcionBotella ? `${mlPorRegistrar} ml` : 'Sin configurar'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.mlCardHint, { color: textSecondary }]}>
                    Selecciona una bebida.
                  </Text>
                )}
              </View>
            );
          })()}

          {productoSeleccionado && Number(productoSeleccionado.ml_abierta ?? 0) > 0 ? (
            <Text style={[styles.mlAbierto, { color: textSecondary }]}>
              Quedan {Number(productoSeleccionado.ml_abierta)} ml en la botella abierta.
            </Text>
          ) : null}
          </>
          )}
        </View>

        {/* — Catálogo de bebidas — */}
        {ruleFromWorker && (
          <ColacionProductsCarousel
            products={catalogoVisible}
            selectedId={productoId}
            loading={productosLoading || analcoholicasLoading}
            onSelect={handleSelectProducto}
            hint="Este rol recibe bebidas analcohólicas habilitadas para colación."
          />
        )}

        {/* — Colaciones del turno — */}
        <View style={styles.historySection}>
          <Text style={[styles.listTitle, { color: textPrimary }]}>
            Colaciones del turno
          </Text>
          <Text style={[styles.listCount, { color: textSecondary }]}>
            {filteredHistory.length} registrado{(filteredHistory.length === 1 ? '' : 's')}
          </Text>

          {!registrosLoading && !registrosError && registros.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.roleTabs}
              accessibilityLabel="Filtrar colaciones por rol"
            >
              {[{ rol: ROL_TODOS, cantidad: registros.length }, ...rolesHistorial].map(({ rol, cantidad }) => {
                const isActive = rolEfectivo === rol;
                return (
                  <Pressable
                    key={rol}
                    accessibilityRole="button"
                    accessibilityLabel={`${rol}, ${cantidad} ${cantidad === 1 ? 'colación' : 'colaciones'}`}
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setHistoryRole(rol)}
                    style={[styles.roleTab, { backgroundColor: isActive ? accentColor : surfaceMuted, borderColor: isActive ? accentColor : borderColor }]}
                  >
                    <Text style={[styles.roleTabText, { color: isActive ? accentText : textPrimary }]}>
                      {rol} · {cantidad}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {registrosLoading ? (
            <View style={styles.loadingRow}>
              <Ionicons name="sync" size={18} color={textSecondary} />
              <Text style={{ color: textSecondary, marginLeft: 4 }}>Cargando colaciones…</Text>
            </View>
          ) : registrosError ? (
            <Text style={[styles.error, { color: accentOnSurface }]}>{registrosError}</Text>
          ) : filteredHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              {registros.length === 0 ? 'Aún no hay colaciones en este turno.' : 'No hay colaciones para este filtro.'}
            </Text>
          ) : (
            <View style={styles.historyCards}>
              {filteredHistory.map((row) => {
                const fecha = row.fecha_crea || row.fecha || '';
                const nickRecibio = row.nick || row.usuario_nombre || '';
                const nickAtendio = row.registrado_por_nick || row.registrado_por_nombre || '';
                const nombreBebida = row.nombre_bebida || row.producto_nombre || 'Corto';
                const acomp = row.acompanamiento_nombre || row.acompanamiento || null;
                const ml = row.ml_bebida ?? 0;
                return (
                  <ColacionHistoryCard
                    key={String(row.id)}
                    fecha={fecha}
                    nickRecibio={nickRecibio}
                    nickAtendio={nickAtendio}
                    nombreBebida={nombreBebida}
                    acompanamiento={acomp}
                    ml={ml}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB flotante — Registrar corto */}
      {productoSeleccionado && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={registrar}
            style={[
              styles.fabButton,
              {
                backgroundColor: canRegister ? accentColor : surfaceMuted,
                opacity: canRegister ? 1 : 0.5,
              },
            ]}
            disabled={!canRegister || saving}
            accessibilityRole="button"
            accessibilityLabel="Registrar colación"
          >
            {saving ? (
              <Ionicons name="sync" size={18} color={accentText} />
            ) : (
              <Ionicons name="receipt" size={18} color={accentText} />
            )}
            <Text style={[styles.fabButtonText, { color: accentText }]}>
              {saving ? 'Guardando…' : 'Registrar corto'}
            </Text>
          </Pressable>
        </View>
      )}

      <ColacionWorkerModal
        visible={workerModalVisible}
        onClose={() => setWorkerModalVisible(false)}
        workers={trabajadores}
        selectedId={workerId}
        onSelect={(id) => {
          setSelectedWorker(id);
          setWorkerModalVisible(false);
        }}
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
  registerCard: {
    padding: 16,
    borderRadius: BorderRadius.card,
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
  selectorBlock: {
    flex: 1,
    borderRadius: BorderRadius.card,
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
    padding: 10,
    borderRadius: BorderRadius.full,
    minHeight: 44,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  mlSection: {
    marginTop: 8,
  },
  mlCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mlLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  mlValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  mlCardHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  mlAbierto: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.card,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historySection: {
    gap: 8,
  },
  roleTabs: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  roleTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    marginRight: 8,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyCards: {
    gap: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listCount: {
    fontSize: 13,
    fontWeight: '600',
  },
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
});

