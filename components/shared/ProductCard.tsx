import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface Product {
    id: string;
    code: string;
    name: string;
    category_id: string;
    price: number;
    commission: number;
    description: string;
    status: number;
    foto: string;
    categoria: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
    selectedHostesses: string[];
    selectedRoom: string | null;
}

export interface Anfitriona {
    id: string;
    nick: string;
    name?: string;
    lastName?: string;
    foto?: string;
}

export interface Room {
    id: string;
    name: string;
    price?: number;
    time?: number;
    status?: number;
}

interface ProductCardProps {
    product: Product;
    cartItem?: CartItem;
    onAdd: (product: Product) => void;
    onRemove: (productId: string) => void;
    onConfigPress: (productId: string, type: 'hostess' | 'room') => void;
    anfitrionas: Anfitriona[];
    rooms: Room[];
}

export const ProductCard = ({
    product,
    cartItem,
    onAdd,
    onRemove,
    onConfigPress,
    anfitrionas,
    rooms
}: ProductCardProps) => {
    const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const qty = cartItem?.quantity || 0;

    const hasCommission = (product.commission || 0) > 0;
    const canSelectRoom = product.price >= 30000 && hasCommission;

    return (
        <View style={[styles.productCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.productMainRow}>
                <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: textPrimary }]}>{product.name}</Text>
                    <Text style={[styles.productDesc, { color: textSecondary }]} numberOfLines={1}>
                        {product.description || 'Sin descripción'}
                    </Text>
                    <Text style={styles.productPrice}>${product.price.toLocaleString()}</Text>
                </View>

                <View style={styles.qtyControl}>
                    {qty > 0 && (
                        <>
                            <Pressable
                                onPress={() => onRemove(product.id)}
                                style={({ pressed }) => [styles.qtyBtn, { backgroundColor: '#EF4444', opacity: pressed ? 0.8 : 1 }]}
                            >
                                <Ionicons name="remove" size={18} color="#FFF" />
                            </Pressable>
                            <Text style={[styles.qtyText, { color: textPrimary }]}>{qty}</Text>
                        </>
                    )}
                    <Pressable
                        onPress={() => onAdd(product)}
                        style={({ pressed }) => [styles.qtyBtn, { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 }]}
                    >
                        <Ionicons name="add" size={18} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            {qty > 0 && hasCommission && (
                <View style={[styles.configBox, { borderTopColor: borderColor }]}>
                    <View style={styles.configRow}>
                        <Pressable
                            onPress={() => onConfigPress(product.id, 'hostess')}
                            style={[styles.configBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
                        >
                            <Ionicons name="person-outline" size={14} color={textPrimary} />
                            <Text style={[styles.configBtnText, { color: textPrimary }]} numberOfLines={1}>
                                {(cartItem?.selectedHostesses?.length ?? 0) > 0
                                    ? `${cartItem?.selectedHostesses.length} Asignada(s)`
                                    : 'Asignar Anfitriona'}
                            </Text>
                        </Pressable>

                        {canSelectRoom && (
                            <Pressable
                                onPress={() => onConfigPress(product.id, 'room')}
                                style={[styles.configBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
                            >
                                <Ionicons name="bed-outline" size={14} color={textPrimary} />
                                <Text style={[styles.configBtnText, { color: textPrimary }]} numberOfLines={1}>
                                    {cartItem?.selectedRoom
                                        ? rooms.find(r => r.id === cartItem.selectedRoom)?.name
                                        : 'Habitación'}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {(cartItem?.selectedHostesses?.length ?? 0) > 0 && (
                        <View style={styles.hostessBadgeContainer}>
                            <Ionicons name="sparkles" size={10} color="#10B981" />
                            <Text style={styles.hostessList}>
                                {cartItem?.selectedHostesses.map(id => anfitrionas.find(a => String(a.id) === String(id))?.nick).filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    productCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    productMainRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    productInfo: {
        flex: 1
    },
    productName: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    productDesc: {
        fontSize: 11,
        marginVertical: 4,
        fontWeight: '500'
    },
    productPrice: {
        fontSize: 18,
        fontWeight: '900',
        color: '#10B981',
        marginTop: 2
    },
    qtyControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    qtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center'
    },
    qtyText: {
        fontSize: 16,
        fontWeight: '900',
        minWidth: 20,
        textAlign: 'center'
    },
    configBox: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1
    },
    configRow: {
        flexDirection: 'row',
        gap: 8
    },
    configBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12
    },
    configBtnText: {
        fontSize: 12,
        fontWeight: '700'
    },
    hostessBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4
    },
    hostessList: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '600'
    },
});

