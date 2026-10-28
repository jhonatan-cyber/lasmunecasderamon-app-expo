import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useRenderCount } from '@/hooks/useRenderCount';

interface CategoryCardProps {
    item: {
        id: string;
        name: string;
        description: string;
        total_products: number;
    };
    index: number;
    onPress: (categoryId: string, categoryName: string) => void;
}

const CategoryCardComponent = ({ item, index, onPress }: CategoryCardProps) => {
    useRenderCount('CategoryCard', { itemId: item.id });
    const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    // Alterna el color del icono para que la rejilla no se vea plana.
    const tone = index % 2 === 0 ? accentColor : '#10B981';

    return (
        <Pressable
            style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: cardBg, borderColor },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => onPress(item.id, item.name)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.total_products} productos`}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${tone}20` }]}>
                <Ionicons name="wine" size={30} color={tone} />
            </View>

            <Text style={[styles.categoryName, { color: textPrimary }]} numberOfLines={2}>
                {item.name}
            </Text>
            <Text style={[styles.categoryDescription, { color: textSecondary }]} numberOfLines={2}>
                {item.description || `Ver productos de ${item.name}`}
            </Text>

            <View style={[styles.productsBadge, { backgroundColor: isDark ? `${accentColor}25` : `${accentColor}10` }]}>
                <Text style={[styles.productsCount, { color: accentColor }]}>
                    {item.total_products}
                </Text>
            </View>
        </Pressable>
    );
};

export const CategoryCard = React.memo(CategoryCardComponent);
CategoryCard.displayName = 'CategoryCard';

const styles = StyleSheet.create({
    categoryCard: {
        flex: 1,
        minHeight: 170,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    categoryDescription: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    productsBadge: {
        minWidth: 32,
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productsCount: {
        fontSize: 13,
        fontWeight: '900'
    },
});

