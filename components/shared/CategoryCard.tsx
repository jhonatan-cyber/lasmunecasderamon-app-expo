import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRenderCount } from '@/hooks/useRenderCount';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

interface CategoryCardProps {
    item: {
        id: string;
        name: string;
        description: string;
        total_products: number;
    };
    index: number;
    onPress: (categoryId: string, categoryName: string) => void;
    compact?: boolean;
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

const CategoryCardComponent = ({ item, index, onPress, compact = false }: CategoryCardProps) => {
    useRenderCount('CategoryCard', { itemId: item.id });
    const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, accentUi} = useAccentColor();
    const reducedMotion = useReducedMotion();
    // Alterna el color del icono para que la rejilla no se vea plana.
    const tone = index % 2 === 0 ? accentColor : accentUi;

    // Glow neón en modo oscuro con el color alternado
    const neonGlow = isDark ? {
        shadowColor: tone,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    } : {};

    // Animación de entrada escalonada. Se declara con `entering` en lugar de
    // escribir shared values desde un efecto: así lo entiende el React Compiler
    // y no hace falta listar dependencias a mano.
    const entering = reducedMotion
        ? undefined
        : FadeIn.delay(index * 80).duration(400);

    return (
        <Animated.View entering={entering}>
            <Pressable
                style={({ pressed }) => [
                    styles.categoryCard,
                    compact && styles.categoryCardCompact,
                    { backgroundColor: cardBg, borderColor },
                    neonGlow,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => onPress(item.id, item.name)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.total_products} productos`}
            >
            <View style={[styles.iconContainer, compact && styles.iconContainerCompact, { backgroundColor: `${tone}20` }]}>
                <Ionicons name={getCategoryIcon(item.name) as any} size={compact ? 22 : 30} color={tone} />
            </View>

            <Text style={[styles.categoryName, compact && styles.categoryNameCompact, { color: textPrimary }]} numberOfLines={2}>
                {item.name}
            </Text>
            {!compact && (
            <Text style={[styles.categoryDescription, { color: textSecondary }]} numberOfLines={2}>
                {item.description || `Ver productos de ${item.name}`}
            </Text>
            )}

            <View style={[styles.productsBadge, compact && styles.productsBadgeCompact, { backgroundColor: isDark ? `${accentColor}25` : `${accentColor}10` }]}>
                <Text style={[styles.productsCount, compact && styles.productsCountCompact, { color: accentOnSurface }]}>
                    {item.total_products}
                </Text>
            </View>
        </Pressable>
        </Animated.View>
    );
};

export const CategoryCard = React.memo(CategoryCardComponent);
CategoryCard.displayName = 'CategoryCard';

const styles = StyleSheet.create({
    categoryCard: {
        flex: 1,
        minHeight: 170,
        borderRadius: BorderRadius.card,
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
    categoryCardCompact: {
        minHeight: 110,
        borderRadius: BorderRadius.md,
        padding: 10,
        gap: 4,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerCompact: {
        width: 40,
        height: 40,
        borderRadius: 12,
    },
    categoryName: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.extrabold,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    categoryNameCompact: {
        fontSize: FontSize.xs,
        letterSpacing: 0,
    },
    categoryDescription: {
        fontSize: FontSize.xs,
        fontFamily: FontFamily.medium,
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
    productsBadgeCompact: {
        minWidth: 26,
        height: 22,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    productsCount: {
        fontSize: FontSize.xs,
        fontFamily: FontFamily.black
    },
    productsCountCompact: {
        fontSize: FontSize.xxs,
    },
});

