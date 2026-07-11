import Ionicons from '@expo/vector-icons/Ionicons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useRouter } from 'expo-router';
import React from 'react';
import { useStableCallback } from '@/hooks/useStableCallback';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import FlashList from "@/components/shared/FlashList";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product, ProductCard } from '@/components/shared/ProductCard';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useGarzonProductos } from '@/hooks/useGarzonProductos';
import { GarzonCartBar, GarzonProductosModales } from '@/components/garzon/productos';

export default function ProductosScreen() {
    const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        categoryName,
        products,
        anfitrionas,
        rooms,
        clients,
        selectedClientId,
        setSelectedClientId,
        loading,
        refreshing,
        submitting,
        clientModalVisible,
        setClientModalVisible,
        clearCartAlertVisible,
        setClearCartAlertVisible,
        activeConfigItem,
        setActiveConfigItem,
        cart,
        addToCart,
        removeFromCart,
        updateItemHostesses,
        updateItemRoom,
        tipEnabled,
        setTipEnabled,
        clearCart,
        tipAmount,
        cartTotal,
        onRefresh,
        getMaxHostesses,
        submitOrder,
    } = useGarzonProductos();

    const renderItem = useStableCallback(({ item }: { item: Product }) => {
        const cartItem = cart.find((i) => i.product.id === item.id);

        return (
            <ProductCard
                product={item}
                cartItem={cartItem}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onConfigPress={(productId, type) =>
                    setActiveConfigItem({ productId, type })
                }
                anfitrionas={anfitrionas}
                rooms={rooms}
            />
        );
    });

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <PremiumHeader 
                title={categoryName || 'Productos'}
                subtitle="Seleccionar productos para el pedido"
                rightComponent={
                    <View style={styles.headerActions}>
                        {cart.length > 0 && (
                            <Pressable 
                                onPress={() => setClearCartAlertVisible(true)}
                                style={styles.clearBtn}
                            >
                                <Ionicons name="trash-outline" size={20} color="#FF4444" />
                            </Pressable>
                        )}
                        <Pressable onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backText}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            {loading && products.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <FlashList
                    data={products}
                    keyExtractor={(item: Product) => String(item.id)}
                    renderItem={renderItem}
                    estimatedItemSize={150}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: cart.length > 0 ? 180 : 40 }
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="fast-food-outline" size={48} color={textSecondary} />
                            <Text style={[styles.emptyText, { color: textSecondary }]}>
                                No hay productos disponibles en esta categoría
                            </Text>
                        </View>
                    }
                />
            )}

            {cart.length > 0 && (
                <GarzonCartBar
                    tipEnabled={tipEnabled}
                    setTipEnabled={setTipEnabled}
                    tipAmount={tipAmount}
                    cartTotal={cartTotal}
                    submitting={submitting}
                    submitOrder={submitOrder}
                    insets={insets}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                />
            )}

            <GarzonProductosModales
                clientModalVisible={clientModalVisible}
                setClientModalVisible={setClientModalVisible}
                clients={clients}
                selectedClientId={selectedClientId}
                setSelectedClientId={setSelectedClientId}
                clearCartAlertVisible={clearCartAlertVisible}
                setClearCartAlertVisible={setClearCartAlertVisible}
                clearCart={clearCart}
                activeConfigItem={activeConfigItem}
                setActiveConfigItem={setActiveConfigItem}
                cart={cart}
                anfitrionas={anfitrionas}
                rooms={rooms}
                getMaxHostesses={getMaxHostesses}
                updateItemHostesses={updateItemHostesses}
                updateItemRoom={updateItemRoom}
                insets={insets}
                accentColor={accentColor}
                borderColor={borderColor}
                cardBg={cardBg}
                textPrimary={textPrimary}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clearBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center'
    },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, gap: 6
    },
    backText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyText: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 12 }
});
