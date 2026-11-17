import { useAccentColor } from '@/hooks/useAccentColor';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';

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
    const {accentColor, cardBg, borderColor, textPrimary} = useAccentColor();

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
                            <Ionicons name={getCategoryIcon(cat.name || cat.nombre || '') as any} size={20} color={accentColor} />
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


