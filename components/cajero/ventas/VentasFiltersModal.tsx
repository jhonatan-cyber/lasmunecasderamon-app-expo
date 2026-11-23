import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';

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
  const {
    accentColor,
    accentText,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    surfaceMuted,
  } = useAccentColor();
  const insets = useSafeAreaInsets();

  const renderChips = <T extends string>(
    options: { value: T; label: string }[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? accentColor : surfaceMuted,
                borderColor: active ? accentColor : borderColor,
              },
            ]}
          >
            <Text style={{ color: active ? accentText : textPrimary }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar filtros"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: cardBg,
              borderColor,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>Filtros</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Ajusta el listado de ventas
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtros"
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.groupLabel, { color: textSecondary }]}>
              Estado
            </Text>
            {renderChips(STATUS_OPTIONS, statusFilter, onStatusChange)}

            <Text style={[styles.groupLabel, { color: textSecondary }]}>
              Método de pago
            </Text>
            {renderChips(PAYMENT_OPTIONS, paymentFilter, onPaymentChange)}

            <Text style={[styles.groupLabel, { color: textSecondary }]}>
              Ordenar por
            </Text>
            {renderChips(SORT_OPTIONS, sortBy, onSortByChange)}

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
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
              style={[styles.clearBtn, { borderColor }]}
            >
              <Text style={{ color: textPrimary }}>Limpiar</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtros"
              style={[styles.applyBtn, { backgroundColor: accentColor }]}
            >
              <Text style={[styles.applyText, { color: accentText }]}>
                Listo
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontFamily: FontFamily.black },
  subtitle: { fontSize: 12, fontFamily: FontFamily.medium, marginTop: 2 },
  groupLabel: {
    fontSize: 11,
    fontFamily: FontFamily.black,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  clearBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    flex: 1.5,
    minHeight: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: 15, fontFamily: FontFamily.black },
});
