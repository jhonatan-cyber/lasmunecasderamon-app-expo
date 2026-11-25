import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius } from '@/constants/spacing';
import {
  FilterSheet,
  type FilterGroup,
} from '@/components/ui/FilterSheet';

export type VentasStatusFilter = 'all' | '1' | '2' | '3' | '0';
export type VentasPaymentFilter =
  | 'all'
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'prepago';
export type VentasSortBy = 'fecha_crea' | 'total' | 'cliente_nombre' | 'codigo';
export type VentasSortOrder = 'asc' | 'desc';

type VentasFiltersModalProps = {
  visible: boolean;
  onClose: () => void;
  statusFilter: VentasStatusFilter;
  paymentFilter: VentasPaymentFilter;
  sortBy: VentasSortBy;
  sortOrder: VentasSortOrder;
  onStatusChange: (value: VentasStatusFilter) => void;
  onPaymentChange: (value: VentasPaymentFilter) => void;
  onSortByChange: (value: VentasSortBy) => void;
  onSortOrderChange: (value: VentasSortOrder) => void;
  onClear: () => void;
};

const STATUS_OPTIONS: { value: VentasStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Completadas' },
  { value: '2', label: 'En proceso' },
  { value: '3', label: 'Pdte. anulación' },
  { value: '0', label: 'Anuladas' },
];

const PAYMENT_OPTIONS: { value: VentasPaymentFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'prepago', label: 'Prepago' },
];

const SORT_OPTIONS: { value: VentasSortBy; label: string }[] = [
  { value: 'fecha_crea', label: 'Fecha' },
  { value: 'total', label: 'Monto' },
  { value: 'cliente_nombre', label: 'Cliente' },
  { value: 'codigo', label: 'Código' },
];

export function VentasFiltersModal({
  visible,
  onClose,
  statusFilter,
  paymentFilter,
  sortBy,
  sortOrder,
  onStatusChange,
  onPaymentChange,
  onSortByChange,
  onSortOrderChange,
  onClear,
}: VentasFiltersModalProps) {
  const { accentColor, borderColor, textPrimary, surfaceMuted } =
    useAccentColor();

  const groups: FilterGroup<any>[] = [
    {
      key: 'estado',
      label: 'Estado',
      options: STATUS_OPTIONS,
      selected: statusFilter,
      onSelect: onStatusChange,
    },
    {
      key: 'metodo-pago',
      label: 'Método de pago',
      options: PAYMENT_OPTIONS,
      selected: paymentFilter,
      onSelect: onPaymentChange,
    },
    {
      key: 'ordenar-por',
      label: 'Ordenar por',
      options: SORT_OPTIONS,
      selected: sortBy,
      onSelect: onSortByChange,
    },
  ];

  return (
    <FilterSheet
      visible={visible}
      onClose={onClose}
      subtitle="Ajusta el listado de ventas"
      groups={groups}
      onClear={onClear}
      extraControls={
        <Pressable
          onPress={() =>
            onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
          }
          accessibilityRole="button"
          accessibilityLabel={
            sortOrder === 'asc'
              ? 'Orden ascendente, tocar para descendente'
              : 'Orden descendente, tocar para ascendente'
          }
          style={[
            styles.orderBtn,
            { borderColor, backgroundColor: surfaceMuted },
          ]}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={18}
            color={accentColor}
          />
          <Text style={{ color: textPrimary }}>
            {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
          </Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  orderBtn: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
});
