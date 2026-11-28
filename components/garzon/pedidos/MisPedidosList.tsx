import Ionicons from '@expo/vector-icons/Ionicons';
/** Historial de pedidos del usuario autenticado. */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { SearchBar } from '@/components/ui/SearchBar';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useMisPedidos, type Pedido } from '@/hooks/useMisPedidos';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { parseDateSafe } from '@/utils/timeUtils';
import { PedidoCard } from './PedidoCard';
import { PedidoDetailModal } from './PedidoDetailModal';

type StatusFilter = 'all' | '1' | '0' | '2' | '3';
type SortBy = 'fecha_crea' | 'total' | 'cliente_nombre' | 'codigo';

type MisPedidosListProps = {
  onNuevoPedido: () => void;
};

const SORT_OPTIONS: { key: SortBy; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'fecha_crea', label: 'Fecha', icon: 'calendar-outline' },
  { key: 'total', label: 'Monto', icon: 'cash-outline' },
  { key: 'cliente_nombre', label: 'Cliente', icon: 'person-outline' },
  { key: 'codigo', label: 'Código', icon: 'barcode-outline' },
];

/**
 * Historial de pedidos propios: resumen
 * por estado, búsqueda, filtro de estado, ordenamiento y detalle del pedido.
 */
export function MisPedidosList({ onNuevoPedido }: MisPedidosListProps) {
  const {
    accentColor,
    accentOnSurface,
    textPrimary,
    textSecondary,
    borderColor,
    cardBg,
  } = useAccentColor();
  const {
    pedidos,
    loading,
    refreshing,
    error,
    fromCache,
    onRefresh,
    fetchPedidos,
  } = useMisPedidos();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const counts = useMemo(
    () => ({
      all: pedidos.length,
      pendientes: pedidos.filter((p) => Number(p.estado) === 1).length,
      aprobados: pedidos.filter((p) => Number(p.estado) === 0).length,
      rechazados: pedidos.filter((p) => Number(p.estado) === 2).length,
      cancelados: pedidos.filter((p) => Number(p.estado) === 3).length,
    }),
    [pedidos],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = pedidos.filter((pedido) => {
      if (statusFilter !== 'all' && Number(pedido.estado) !== Number(statusFilter)) {
        return false;
      }
      if (!term) return true;
      return [pedido.codigo, pedido.cliente_nombre, pedido.mesero_nombre, pedido.nicks]
        .some((value) => String(value ?? '').toLowerCase().includes(term));
    });

    return [...rows].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      if (sortBy === 'total') {
        aValue = Number(a.total || 0);
        bValue = Number(b.total || 0);
      } else if (sortBy === 'fecha_crea') {
        aValue = a.fecha_crea ? parseDateSafe(a.fecha_crea).getTime() || 0 : 0;
        bValue = b.fecha_crea ? parseDateSafe(b.fecha_crea).getTime() || 0 : 0;
      } else {
        aValue = String(a[sortBy] ?? '').toLowerCase();
        bValue = String(b[sortBy] ?? '').toLowerCase();
      }
      if (aValue === bValue) return 0;
      const result = aValue > bValue ? 1 : -1;
      return sortOrder === 'asc' ? result : -result;
    });
  }, [pedidos, search, statusFilter, sortBy, sortOrder]);

  const openSortSheet = useCallback(() => setSortSheetVisible(true), []);

  const sortItems = SORT_OPTIONS.map((option) => ({
    icon: option.key === sortBy ? ('checkmark' as const) : option.icon,
    label: option.label,
    color: option.key === sortBy ? accentOnSurface : textPrimary,
    onPress: () => {
      setSortBy(option.key);
      setSortSheetVisible(false);
    },
  }));

  const sortDirectionLabel =
    sortBy === 'fecha_crea'
      ? sortOrder === 'asc'
        ? 'Más antiguos primero'
        : 'Más recientes primero'
      : sortBy === 'total'
        ? sortOrder === 'asc'
          ? 'Menor a mayor'
          : 'Mayor a menor'
        : sortOrder === 'asc'
          ? 'A a Z'
          : 'Z a A';
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'all';

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            compact
            placeholder="Buscar por cliente, código o nicks..."
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch('')}
          />
        </View>
        <Pressable
          onPress={openSortSheet}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar pedidos por ${SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'fecha'}`}
          style={[
            styles.iconBtn,
            {
              backgroundColor:
                sortBy !== 'fecha_crea' || sortOrder !== 'desc'
                  ? `${accentColor}18`
                  : cardBg,
              borderColor:
                sortBy !== 'fecha_crea' || sortOrder !== 'desc'
                  ? accentColor
                  : borderColor,
            },
          ]}
        >
          <Ionicons name="swap-vertical" size={20} color={accentOnSurface} />
        </Pressable>
        <Pressable
          onPress={() => setSortOrder((value) => (value === 'asc' ? 'desc' : 'asc'))}
          accessibilityRole="button"
          accessibilityLabel={
            sortOrder === 'asc' ? 'Orden ascendente' : 'Orden descendente'
          }
          style={[styles.iconBtn, { backgroundColor: cardBg, borderColor }]}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={20}
            color={textPrimary}
          />
        </Pressable>
      </View>

      <FilterTabs
        scrollable
        tabs={[
          { key: 'all', label: 'Todos', count: counts.all },
          { key: '1', label: 'Pendientes', count: counts.pendientes },
          { key: '0', label: 'Aprobados', count: counts.aprobados },
          { key: '2', label: 'Rechazados', count: counts.rechazados },
          { key: '3', label: 'Cancelados', count: counts.cancelados },
        ]}
        activeKey={statusFilter}
        onTabPress={(key) => setStatusFilter(key as StatusFilter)}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      {fromCache && (
        <Text style={[styles.cacheNote, { color: textSecondary }]}>
          Mostrando pedidos guardados en el dispositivo.
        </Text>
      )}

      {error && pedidos.length === 0 ? (
        <EmployeeListError
          message={error}
          onRetry={() => void fetchPedidos(true)}
        />
      ) : loading && pedidos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentOnSurface} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            Cargando pedidos…
          </Text>
        </View>
      ) : (
        <VirtualizedList
          data={filtered}
          keyExtractor={(item: Pedido) => item.id_pedido}
          renderItem={({ item }: { item: Pedido }) => (
            <PedidoCard pedido={item} onPress={setSelectedPedido} />
          )}
          estimatedItemSize={170}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accentColor}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={
                hasActiveFilters
                  ? 'No se encontraron pedidos'
                  : 'Todavía no tienes pedidos'
              }
              message={
                hasActiveFilters
                  ? 'Prueba con otro cliente, código o estado.'
                  : 'Crea el primero desde el catálogo.'
              }
              actionLabel={hasActiveFilters ? 'Limpiar búsqueda y filtros' : 'Nuevo pedido'}
              onAction={
                hasActiveFilters
                  ? () => {
                      setSearch('');
                      setStatusFilter('all');
                    }
                  : onNuevoPedido
              }
            />
          }
        />
      )}

      <ActionSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        title="Ordenar pedidos"
        subtitle={`${sortDirectionLabel} · toca la flecha para invertir`}
        items={sortItems}
      />

      <PedidoDetailModal
        visible={!!selectedPedido}
        pedido={selectedPedido}
        onClose={() => setSelectedPedido(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheNote: {
    paddingHorizontal: 18,
    paddingTop: 2,
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, fontFamily: FontFamily.medium },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
});
