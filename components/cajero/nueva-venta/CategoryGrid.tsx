import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { haptic } from '@/utils/haptics';

interface CategoryItem {
  id?: string | number;
  name?: string;
  nombre?: string;
}

interface CategoryGridProps {
  categories: CategoryItem[];
  onSelect: (cat: CategoryItem) => void;
  accentColor: string;
  textPrimary: string;
  borderColor: string;
}

const CATEGORY_ICONS: ReadonlyArray<[RegExp, string]> = [
  [/cerve/, 'beer'],
  [/vino/, 'wine'],
  [/cocktail|coctail/, 'wine'],
  [/cafe|café|coffee/, 'cafe'],
  [/pizza/, 'pizza'],
  [/hamburguesa|burger/, 'fast-food'],
  [/helado|ice cream/, 'ice-cream'],
  [/pasta/, 'restaurant'],
  [/pescado|fish/, 'fish'],
  [/bebida|drink/, 'cafe'],
];

function getCategoryIcon(name: string): string {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [regex, icon] of CATEGORY_ICONS) {
    if (regex.test(normalized)) return icon;
  }
  return 'pricetags';
}

/**
 * Grilla horizontal de categorías con iconos automáticos.
 * Extraído de nueva-venta.tsx para reducir el tamaño del screen.
 */
export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onSelect,
  accentColor,
  textPrimary,
  borderColor,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}
    >
      {categories.map((cat, idx) => {
        const name = cat.name || cat.nombre || '';
        const icon = getCategoryIcon(name);
        return (
          <Pressable
            key={cat.id || idx}
            onPress={() => {
              haptic.select();
              onSelect(cat);
            }}
            style={{
              minWidth: 120,
              padding: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor,
              backgroundColor: 'rgba(155,155,155,0.03)',
              alignItems: 'center',
            }}
            accessibilityRole="button"
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${accentColor}15`,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name={icon as any} size={20} color={accentColor} />
            </View>
            <Text
              style={{ color: textPrimary, fontSize: 12, fontWeight: '800', textAlign: 'center' }}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
