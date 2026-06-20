import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Category {
    id: number;
    name: string;
}

interface CategorySelectorProps {
    categories: Category[];
    handleOpenCategory: (category: Category) => void;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
}

export function CategorySelector({
    categories,
    handleOpenCategory,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
}: CategorySelectorProps) {
    return (
        <View style={styles.browserContainer}>
            <Text style={[styles.browserTitle, { color: textPrimary }]}>1. Selección de Productos</Text>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoryScroll}
            >
                {categories.map((cat) => (
                    <Pressable
                        key={cat.id}
                        style={[styles.categorySmallCard, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => handleOpenCategory(cat)}
                        accessibilityLabel={`Categoría ${cat.name}`}
                        accessibilityRole="button"
                    >
                        <View style={[styles.catIconBox, { backgroundColor: `${accentColor}15` }]}>
                            <Ionicons name="beer-outline" size={20} color={accentColor} />
                        </View>
                        <Text style={[styles.catSmallName, { color: textPrimary }]}>{cat.name}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    browserContainer: { 
        marginBottom: 20 
    },
    browserTitle: { 
        fontSize: 13, 
        fontWeight: '900', 
        marginBottom: 16, 
        textTransform: 'uppercase', 
        opacity: 0.6 
    },
    categoryScroll: { 
        gap: 12 
    },
    categorySmallCard: { 
        width: 140, 
        padding: 12, 
        borderRadius: 20, 
        borderWidth: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        minHeight: 64 
    },
    catIconBox: { 
        width: 38, 
        height: 38, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    catSmallName: { 
        fontSize: 12, 
        fontWeight: '800' 
    },
});
