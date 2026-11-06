import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { ColacionProducto } from '@/services/colaciones-helpers';

interface Props {
  products: ColacionProducto[];
  selectedId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}

export const ColacionProductsCarousel: React.FC<Props> = ({
  products,
  selectedId,
  loading,
  onSelect,
}) => {
  const { accentColor, bg, textPrimary, textSecondary } = useAccentColor();

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Bebidas</Text>
      <View style={styles.row}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.skeleton, { backgroundColor: '#E5E7EB' }]} />
          ))
        ) : products.length === 0 ? (
          <Text style={{ color: textSecondary }}>Sin bebidas disponibles.</Text>
        ) : (
          products.map((product) => {
            const isSelected = String(product.id) === selectedId;
            return (
              <Pressable
                key={product.id}
                onPress={() => onSelect(String(product.id))}
                style={[styles.chip, { borderColor: isSelected ? accentColor : '#E5E7EB' }]}
              >
                <Text style={[styles.chipText, { color: isSelected ? accentColor : textPrimary }]}>
                  {product.presentacion_nombre}
                </Text>
                <Text style={{ color: textSecondary }}>{product.ml_botella} ml</Text>
              </Pressable>
            );
          })
        )}
      </View>
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
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  skeleton: {
    height: 40,
    width: 120,
    borderRadius: 999,
    marginRight: 8,
  },
});
