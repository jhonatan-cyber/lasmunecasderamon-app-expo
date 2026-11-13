import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AcompanamientoOpcion } from '@/services/colaciones-helpers';

interface Props {
  acompanamientos: AcompanamientoOpcion[];
  selectedId: string;
  loading: boolean;
  error?: string | null;
  onSelect: (id: string) => void;
}

export const ColacionAcompanamientoSelector: React.FC<Props> = ({
  acompanamientos,
  selectedId,
  loading,
  error,
  onSelect,
}) => {
  const { accentColor, bg, textPrimary, textSecondary } = useAccentColor();

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Acompañamiento</Text>
      <Text style={[styles.hint, { color: textSecondary }]}>
        Se elige del mismo catálogo de bebidas analcohólicas que reciben cajero, garzón y
        barman.
      </Text>
      {loading ? (
        <View style={styles.row}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : error ? (
        <Text style={[styles.error, { color: '#EF4444' }]}>{error}</Text>
      ) : acompanamientos.length === 0 ? (
        <Text style={{ color: textSecondary }}>
          Sin bebidas con stock suficiente para acompañar.
        </Text>
      ) : (
        <View style={styles.row}>
          {acompanamientos.map((opcion) => {
            const isSelected = String(opcion.id) === selectedId;
            return (
              <Pressable
                key={String(opcion.id)}
                accessibilityLabel={opcion.nombre}
                onPress={() => onSelect(isSelected ? '' : String(opcion.id))}
                style={[
                  styles.chip,
                  {
                    borderColor: isSelected ? accentColor : '#E5E7EB',
                    backgroundColor: isSelected ? `${accentColor}18` : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: isSelected ? accentColor : textPrimary }]}
                >
                  {opcion.presentacion_nombre || opcion.nombre}
                </Text>
                <Text style={[styles.chipMeta, { color: textSecondary }]}>
                  {opcion.ml > 0 ? `${opcion.ml} ml` : 'Sin ml'}
                  {opcion.cantidad && opcion.cantidad > 1 ? ` · x${opcion.cantidad}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
    minWidth: 88,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  skeleton: {
    height: 44,
    width: 120,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ColacionAcompanamientoSelector;
