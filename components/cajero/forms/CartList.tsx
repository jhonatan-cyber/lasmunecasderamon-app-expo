import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '../../../hooks/useAccentColor';

export interface CartItem {
    id?: number;
    id_producto?: number;
    name?: string;
    nombre?: string;
    price?: number;
    precio?: number;
    quantity: number;
    cantidad?: number;
    [key: string]: any;
}

interface CartListProps {
    items: CartItem[];
    onUpdateQuantity?: (index: number, delta: number) => void;
    onRemove?: (index: number) => void;
    title?: string;
    hideQuantityControls?: boolean;
}

export const CartList: React.FC<CartListProps> = ({
    items,
    onUpdateQuantity,
    onRemove,
    title = '3. Carrito',
    hideQuantityControls = false
}) => {
    const { accentColor, isDark } = useAccentColor();
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const groupedItems = React.useMemo(() => {
        const ObjectGroups: Record<number, any> = {};

        items.forEach((item, idx) => {
            const id = item.id || item.id_producto || idx;
            if (!ObjectGroups[id]) {
                ObjectGroups[id] = {
                    id,
                    name: item.name || item.nombre || 'Producto',
                    precio: item.precio || item.price || 0,
                    totalQty: 0,
                    subItems: []
                };
            }
            ObjectGroups[id].totalQty += (item.quantity || item.cantidad || 1);
            ObjectGroups[id].subItems.push({ ...item, originalIndex: idx });
        });

        return Object.values(ObjectGroups);
    }, [items]);

    if (items.length === 0) return null;

    return (
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            {title ? <Text style={[styles.sectionTitle, { color: textPrimary }]}>{title}</Text> : null}
            {groupedItems.map((group, groupIdx) => (
                <View key={groupIdx} style={[styles.cartItem, { borderBottomColor: 'rgba(155,155,155,0.1)' }]}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.groupHeader}>
                            <Text style={[styles.itemName, { color: textPrimary }]}>
                                {group.name}{'  '}
                                <Text style={{ fontWeight: '900', color: '#10B981' }}>x{group.totalQty}</Text>
                            </Text>
                            <Text style={[styles.itemSub, { color: textSecondary }]}>
                                ${(group.precio).toLocaleString()} c/u
                            </Text>
                        </View>

                        <View style={styles.subItemsContainer}>
                            {group.subItems.map((sub: any, sIdx: number) => (
                                <View key={sIdx} style={styles.subItemRow}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={{ fontSize: 13, color: sub.hostessNames ? accentColor : textSecondary, fontWeight: '700' }}>
                                            {sub.hostessNames ? `Anfitrionas: ${sub.hostessNames}` : 'Sin anfitriona'}
                                        </Text>
                                    </View>

                                    {!hideQuantityControls && (
                                        <View style={styles.qtyControls}>
                                            {onUpdateQuantity && (
                                                <Pressable
                                                    onPress={() => onUpdateQuantity(sub.originalIndex, -1)}
                                                    style={styles.qtyBtn}
                                                >
                                                    <Ionicons name="remove" size={16} color={textPrimary} />
                                                </Pressable>
                                            )}
                                            <Text style={[styles.qtyText, { color: textPrimary }]}>
                                                {sub.quantity || sub.cantidad || 1}
                                            </Text>
                                            {onUpdateQuantity && (
                                                <Pressable
                                                    onPress={() => onUpdateQuantity(sub.originalIndex, 1)}
                                                    style={styles.qtyBtn}
                                                >
                                                    <Ionicons name="add" size={16} color={textPrimary} />
                                                </Pressable>
                                            )}
                                            {onRemove && (
                                                <Pressable
                                                    onPress={() => onRemove(sub.originalIndex)}
                                                    style={[styles.deleteBtnOnly, { backgroundColor: 'rgba(239,68,68,0.1)', marginLeft: 12 }]}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                </Pressable>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    section: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase', opacity: 0.6 },
    cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
    itemName: { fontSize: 15, fontWeight: '700' },
    itemSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    qtyControls: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(155,155,155,0.1)', justifyContent: 'center', alignItems: 'center' },
    qtyText: { marginHorizontal: 12, fontSize: 14, fontWeight: '900' },
    deleteBtnOnly: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    groupHeader: { marginBottom: 8 },
    subItemsContainer: { paddingLeft: 8, marginTop: 4, borderLeftWidth: 2, borderLeftColor: 'rgba(155,155,155,0.2)' },
    subItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }
});
