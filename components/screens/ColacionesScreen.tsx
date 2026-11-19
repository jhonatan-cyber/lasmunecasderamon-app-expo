import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { ModalBottomSheet } from '@/components/ui/ModalBottomSheet';
import { ColacionProductsCarousel } from '@/components/colaciones/ColacionProductsCarousel';
import { ColacionAcompanamientoSelector } from '@/components/colaciones/ColacionAcompanamientoSelector';
import { useColacionesScreen } from '@/hooks/useColacionesScreen';
import { nombreRolLegible } from '@/utils/userRole';

/** Filtro que muestra el turno completo. */
const ROL_TODOS = 'Todos';
/** Único rol con permiso para registrar colaciones (ver app/(app)/barman/colaciones.tsx). */
const ROL_QUE_REGISTRA = 'barman';


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

/** Construye un fondo sutil a partir de un color hexadecimal. */
function colorConOpacidad(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function ColacionesScreen() {
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

  // La bebida se elige en el carrusel; este bloque solo resume la selección.
  const resumenBebida = useMemo(() => {
    if (productosLoading || analcoholicasLoading) return 'Cargando…';
    if (productoSeleccionado)
      return `${productoSeleccionado.producto_nombre} ${productoSeleccionado.presentacion_nombre}`.trim();
    if (!selectedWorker) return 'Selecciona un trabajador';
    if (!ruleFromWorker) return 'Este rol no recibe colación';
    return catalogoVisible.length ? 'Elige una de la lista' : 'Sin bebidas disponibles';
  }, [
    productosLoading,
    analcoholicasLoading,
    productoSeleccionado,
    selectedWorker,
    ruleFromWorker,
    catalogoVisible.length,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Colaciones"
        subtitle="Un corto por trabajador durante el turno"
        onBack={() => router.back()}
        showThemeToggle
        rightComponent={
          <View style={[styles.registraBadge, { borderColor, backgroundColor: surfaceMuted }]}>
            <Text style={[styles.registraBadgeLabel, { color: textSecondary }]}>Registra</Text>
            <Text style={[styles.registraBadgeValor, { color: accentColor }]}>{ROL_QUE_REGISTRA}</Text>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={productosLoading || trabajadoresLoading || registrosLoading} onRefresh={recargar} tintColor={accentColor} />
        }
      >
        <View style={[styles.registerCard, { backgroundColor: cardBg, borderColor }]}>
          <Pressable onPress={() => setRegisterCardCollapsed(!registerCardCollapsed)} style={styles.registerCardHeader}>
            <Ionicons name="beer-outline" size={20} color={accentColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Registrar colación</Text>
              <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
                Un trabajador, un corto por turno.
              </Text>
            </View>
            <Ionicons name={registerCardCollapsed ? "chevron-down" : "chevron-up"} size={20} color={accentColor} />
          </Pressable>

          {!registerCardCollapsed && (
          <>
          <View style={[styles.errorBox, { borderBottomColor: borderColor }]}>
            {productosError || analcoholicasError || trabajadoresError ? (
              <Text style={[styles.error, { color: '#EF4444' }]}>
                {productosError || analcoholicasError || trabajadoresError}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => !trabajadoresLoading && trabajadores.length > 0 && setWorkerModalVisible(true)}
            style={[styles.selectButton, { borderColor, opacity: trabajadoresLoading || trabajadores.length === 0 ? 0.5 : 1 }]}
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

          {ruleFromWorker && (
            <View style={styles.productsCarousel}>
              <ColacionProductsCarousel
                products={catalogoVisible}
                selectedId={productoId}
                loading={productosLoading || analcoholicasLoading}
                onSelect={handleSelectProducto}
                hint="Este rol recibe bebidas analcohólicas habilitadas para colación."
              />
            </View>
          )}

          {acompanamientoRenderer}

          {(() => {
            const catColor = productoSeleccionado
              ? colorDeCategoria(productoSeleccionado.categoria_nombre ?? productoSeleccionado.categoria ?? productoSeleccionado.producto_categoria)
              : null;
            return (
              <View style={[styles.mlCard, {
                backgroundColor: catColor ? colorConOpacidad(catColor, 0.1) : surfaceMuted,
                borderColor: catColor ?? borderColor,
              }]}>
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
          </>
          )}
        </View>

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
                    <Text style={[styles.roleTabText, { color: isActive ? '#FFFFFF' : textPrimary }]}>
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
            <Text style={[styles.error, { color: '#EF4444' }]}>{registrosError}</Text>
          ) : filteredHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              {registros.length === 0 ? 'Aún no hay colaciones en este turno.' : 'No hay colaciones para este filtro.'}
            </Text>
          ) : (
            <View style={styles.historyCards}>
              {filteredHistory.map((row) => {
                const fecha = row.fecha_crea || row.fecha || '';
                const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '';
                const hora = fecha ? new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                const nickRecibio = row.nick || row.usuario_nombre || '';
                const nickAtendio = row.registrado_por_nick || row.registrado_por_nombre || '';
                const nombreBebida = row.nombre_bebida || row.producto_nombre || 'Corto';
                const acomp = row.acompanamiento_nombre || row.acompanamiento || null;
                const ml = row.ml_bebida ?? 0;
                return (
                  <View key={String(row.id)} style={[styles.historyCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.historyCardLeft}>
                      <Text style={[styles.historyCardNick, { color: textPrimary }]}>
                        {nickRecibio}
                      </Text>
                      <Text style={[styles.historyCardProduct, { color: textSecondary }]}>
                        {nombreBebida}
                      </Text>
                      <View style={styles.historyCardMeta}>
                        <Text style={[styles.historyCardMetaText, { color: textSecondary }]}>
                          {ml} ml
                        </Text>
                        {acomp ? (
                          <Text style={[styles.historyCardMetaText, { color: textSecondary }]}>
                            · {acomp}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.historyCardRight}>
                      <Text style={[styles.historyCardBy, { color: textSecondary }]}>↘ {nickAtendio}</Text>
                      <View style={styles.historyCardDateTime}>
                        {fechaStr ? (
                          <Text style={[styles.historyCardDate, { color: textSecondary }]}>{fechaStr}</Text>
                        ) : null}
                        {hora ? (
                          <Text style={[styles.historyCardTime, { color: textSecondary }]}>{hora}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <ModalBottomSheet
        visible={workerModalVisible}
        onClose={() => setWorkerModalVisible(false)}
        title="Seleccionar trabajador"
        subtitle={`${trabajadores.length} trabajadores disponibles`}
        actionLabel="Listo"
        onAction={() => setWorkerModalVisible(false)}
      >
        <FlatList
          data={trabajadores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = workerId === item.id;
            return (
              <Pressable
                onPress={() => {
                  setSelectedWorker(item.id);
                  setWorkerModalVisible(false);
                }}
                style={[
                  styles.workerItem,
                  {
                    borderColor: isSelected ? accentColor : borderColor,
                    backgroundColor: isSelected ? `${accentColor}15` : 'transparent',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.workerName, { color: textPrimary }]}>
                    {item.name} {item.lastName}
                  </Text>
                  {item.nick ? (
                    <Text style={[styles.workerNick, { color: textSecondary }]}>{item.nick}</Text>
                  ) : null}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={accentColor} />
                )}
              </Pressable>
            );
          }}
        />
      </ModalBottomSheet>

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
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 10,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  workerNick: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  productsCarousel: {
    marginTop: 4,
  },
  mlCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
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
    borderRadius: 9999,
    borderWidth: 1.5,
    marginRight: 8,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  registraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  registraBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  registraBadgeValor: {
    fontSize: 12,
    fontWeight: '900',
  },
  historyCards: {
    gap: 8,
  },
  historyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardLeft: {
    flex: 1,
    gap: 2,
  },
  historyCardNick: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyCardProduct: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCardRight: {
    alignItems: 'flex-end',
  },
  historyCardBy: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  historyCardMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCardDateTime: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  historyCardDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCardTime: {
    fontSize: 11,
    fontWeight: '600',
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

