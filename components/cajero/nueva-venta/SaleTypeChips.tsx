import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OpcionVentaProducto, SaleChoice } from '@/hooks/utils/saleChoice';

interface SaleTypeChipsProps {
    opciones: OpcionVentaProducto[];
    value: SaleChoice;
    onChange: (value: SaleChoice) => void;
    accentColor: string;
    textPrimary: string;
    borderColor: string;
}

/**
 * Selector de forma de venta (Botella / Shot cliente / Shot anfitriona) de una
 * presentación, espejo de los chips del buscador y del modal del dashboard.
 * Solo se pinta cuando el producto ofrece más de una forma de venta.
 */
export const SaleTypeChips: React.FC<SaleTypeChipsProps> = ({
    opciones,
    value,
    onChange,
    accentColor,
    textPrimary,
    borderColor,
}) => {
    if (opciones.length <= 1) return null;

    return (
        <View style={styles.row}>
            {opciones.map((opcion) => {
                const selected = value === opcion.value;
                return (
                    <Pressable
                        key={opcion.value}
                        onPress={() => onChange(opcion.value)}
                        style={[
                            styles.chip,
                            { borderColor },
                            selected && { backgroundColor: accentColor, borderColor: accentColor },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Vender como ${opcion.nombre}`}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                { color: selected ? '#FFFFFF' : textPrimary },
                            ]}
                            numberOfLines={1}
                        >
                            {opcion.nombre} · ${opcion.precio.toLocaleString()}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
        borderWidth: 1,
        backgroundColor: 'rgba(155,155,155,0.06)',
    },
    chipText: {
        fontSize: 10,
        fontWeight: '800',
    },
});

export default SaleTypeChips;
