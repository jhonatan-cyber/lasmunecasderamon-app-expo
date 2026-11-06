import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AcompanamientoOpcion } from '@/services/colaciones-helpers';

interface Props {
  acompanamientos: AcompanamientoOpcion[];
  selectedId: string;
  loading: boolean;
  required: boolean;
  mlPorUnidad: number | null;
  unidadesRequeridas: number;
  productoId: string;
  onSelect: (id: string) => void;
  totalUnidades?: number;
}

export const ColacionAcompanamientoSelector: React.FC<Props> = ({
  acompanamientos,
  selectedId,
  loading,
  onSelect,
  mlPorUnidad,
  unidadesRequeridas,
  totalUnidades,
}) => {
  const { accentColor, bg, textPrimary, textSecondary } = useAccentColor();

  const selected = acompanamientos.find((a) => String(a.id) === selectedId);

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Acompañamiento</Text>
      {selected ? (
        <Pressable
          onPress={() => onSelect('')}
          style={[styles.selectedChip, { borderColor: accentColor }]}
        >
          <Text style={[styles.selectedText, { color: accentColor }]}>
            {selected.nombre}
          </Text>
          <Text style={{ color: textSecondary }}> | x{selected.cantidad ?? 1}</Text>
        </Pressable>
      ) : (
        <Text style={{ color: textSecondary }}>Sin seleccionar</Text>
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
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.04)',
    gap: 6,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ColacionAcompanamientoSelector;
