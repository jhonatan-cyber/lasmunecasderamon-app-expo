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

/**
 * Mapea el nombre de una categoría a un ícono de Ionicons relevante.
 */
function getCategoryIcon(name: string): string {
    const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Bebidas alcohólicas
    if (/cerve/.test(n)) return 'beer';
    if (/vino/.test(n)) return 'wine';
    if (/cocktail|coctail/.test(n)) return 'wine';
    if (/licor/.test(n)) return 'flame';
    if (/ron/.test(n)) return 'flame';
    if (/tequila/.test(n)) return 'flame';
    if (/whisky|whisk(e|y)/.test(n)) return 'flame';
    if (/champagne|champán/.test(n)) return 'sparkles';
    if (/refresco|gaseosa|soda/.test(n)) return 'water';
    
    // Bebidas no alcohólicas
    if (/cafe|café|coffee/.test(n)) return 'cafe';
    if (/té|te/.test(n)) return 'cafe';
    if (/agua/.test(n)) return 'water';
    if (/jugo/.test(n)) return 'juice';
    if (/smoothie/.test(n)) return 'cafe';
    if (/licuad/.test(n)) return 'cafe';
    if (/postre|postre/.test(n)) return 'ice-cream';
    
    // Comidas principales
    if (/pizza/.test(n)) return 'pizza';
    if (/hamburguesa|burger/.test(n)) return 'fast-food';
    if (/pasta/.test(n)) return 'restaurant';
    if (/carne|steak|bife/.test(n)) return 'restaurant';
    if (/pollo|chicken/.test(n)) return 'restaurant';
    if (/pescado|fish|marisco/.test(n)) return 'fish';
    if (/sushi/.test(n)) return 'fish';
    if (/ensalada|salad/.test(n)) return 'leaf';
    if (/sopa/.test(n)) return 'restaurant';
    if (/huevo/.test(n)) return 'restaurant';
    if (/hotdog|hot dog/.test(n)) return 'fast-food';
    if (/taco/.test(n)) return 'fast-food';
    if (/arepa/.test(n)) return 'fast-food';
    if (/empanada/.test(n)) return 'fast-food';
    if (/sandwich|sándwich/.test(n)) return 'fast-food';
    if (/wrap/.test(n)) return 'fast-food';
    
    // Entradas y snacks
    if (/entrada|appetizer|aperitivo/.test(n)) return 'restaurant';
    if (/papa|potato|papas fritas/.test(n)) return 'fast-food';
    if (/snack|botana/.test(n)) return 'fast-food';
    if (/nugget/.test(n)) return 'fast-food';
    if (/alitas|wing/.test(n)) return 'fast-food';
    if (/nachos/.test(n)) return 'fast-food';
    
    // Panadería y repostería
    if (/pan|bread/.test(n)) return 'restaurant';
    if (/pastel|cake/.test(n)) return 'ice-cream';
    if (/torta/.test(n)) return 'ice-cream';
    if (/helado|ice cream/.test(n)) return 'ice-cream';
    if (/galleta|cookie/.test(n)) return 'ice-cream';
    if (/dona|donut/.test(n)) return 'ice-cream';
    if (/fruta/.test(n)) return 'leaf';
    
    // Desayunos
    if (/desayuno|breakfast/.test(n)) return 'restaurant';
    
    // Genéricos
    if (/bebida|drink|bebidas/.test(n)) return 'cafe';
    if (/comida|food|plato/.test(n)) return 'restaurant';
    
    // Default
    return 'pricetags';
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
                <Ionicons name={getCategoryIcon(item.name) as any} size={30} color={tone} />
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

