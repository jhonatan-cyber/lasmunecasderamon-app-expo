import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface Category {
    id?: number;
    id_categoria?: number;
    name?: string;
    nombre?: string;
    [key: string]: any;
}

interface CategorySelectorProps {
    categories: Category[];
    onSelectCategory: (category: Category) => void;
    title?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    categories,
    onSelectCategory,
    title = '1. Selección de Categoría'
}) => {
    const { accentColor, isDark, cardBg, borderColor } = useAccentColor();
    const textPrimary = isDark ? '#FFFFFF' : '#000000';

    return (
        <View style={styles.browserContainer}>
            {title ? <Text style={[styles.browserTitle, { color: textPrimary }]}>{title}</Text> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {categories.map((cat, idx) => (
                    <Pressable
                        key={cat.id || cat.id_categoria || idx}
                        style={[styles.categorySmallCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => onSelectCategory(cat)}
                        accessibilityLabel={`Categoría ${cat.name || cat.nombre}`}
                        accessibilityRole="button"
                    >
                        <View style={[styles.catIconBox, { backgroundColor: `${accentColor}15` }]}>
                            <Ionicons name="beer-outline" size={20} color={accentColor} />
                        </View>
                        <Text style={[styles.catSmallName, { color: textPrimary }]}>{cat.name || cat.nombre}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    browserContainer: { marginBottom: 20 },
    browserTitle: { fontSize: 13, fontWeight: '900', marginBottom: 15, letterSpacing: 1, textTransform: 'uppercase' },
    categoryScroll: { gap: 12 },
    categorySmallCard: { minWidth: 120, padding: 12, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    catIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    catSmallName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
});


