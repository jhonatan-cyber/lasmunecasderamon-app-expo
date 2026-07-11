import { Ionicons } from '@expo/vector-icons';
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
    onPress: () => void;
}

export const CategoryCard = ({ item, index, onPress }: CategoryCardProps) => {
    useRenderCount('CategoryCard', { itemId: item.id });
    const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: cardBg, borderColor },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={onPress}
        >
            <View style={styles.categoryContent}>
                <View style={[styles.iconContainer, { backgroundColor: index % 2 === 0 ? `${accentColor}20` : '#10B98120' }]}>
                    <Ionicons name="wine" size={30} color={index % 2 === 0 ? accentColor : '#10B981'} />
                </View>

                <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.categoryDescription, { color: textSecondary }]} numberOfLines={1}>
                        {item.description || `Ver productos de ${item.name}`}
                    </Text>
                </View>

                <View style={styles.categoryRight}>
                    <View style={[styles.productsBadge, { backgroundColor: isDark ? `${accentColor}25` : `${accentColor}10` }]}>
                        <Text style={[styles.productsCount, { color: accentColor }]}>
                            {item.total_products}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    categoryCard: {
        borderRadius: 24,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
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
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryInfo: {
        flex: 1,
        marginLeft: 16
    },
    categoryName: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3
    },
    categoryDescription: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500'
    },
    categoryRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    productsBadge: {
        minWidth: 32,
        height: 32,
        paddingHorizontal: 8,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productsCount: {
        fontSize: 13,
        fontWeight: '900'
    },
});

