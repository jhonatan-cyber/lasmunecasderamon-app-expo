import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { showToast } from '@/utils/toast-lazy';
import { ClientSelectModal } from '@/components/cajero/forms/ClientSelectModal';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { Anfitriona, CartItem, Room } from '@/components/shared/ProductCard';
import { Client } from '@/hooks/useGarzonProductos';

interface GarzonProductosModalesProps {
    clientModalVisible: boolean;
    setClientModalVisible: (visible: boolean) => void;
    clients: Client[];
    selectedClientId: string | null;
    setSelectedClientId: (id: string | null) => void;

    clearCartAlertVisible: boolean;
    setClearCartAlertVisible: (visible: boolean) => void;
    clearCart: () => void;

    activeConfigItem: { productId: string, type: 'hostess' | 'room' } | null;
    setActiveConfigItem: (item: { productId: string, type: 'hostess' | 'room' } | null) => void;
    cart: CartItem[];
    anfitrionas: Anfitriona[];
    rooms: Room[];
    getMaxHostesses: (item: CartItem) => number;
    updateItemHostesses: (productId: string, hostessIds: number[]) => void;
    updateItemRoom: (productId: string, roomId: string | null) => void;

    insets: { bottom: number };
    accentColor: string;
    borderColor: string;
    cardBg: string;
    textPrimary: string;
}

export const GarzonProductosModales: React.FC<GarzonProductosModalesProps> = ({
    clientModalVisible,
    setClientModalVisible,
    clients,
    selectedClientId,
    setSelectedClientId,
    clearCartAlertVisible,
    setClearCartAlertVisible,
    clearCart,
    activeConfigItem,
    setActiveConfigItem,
    cart,
    anfitrionas,
    rooms,
    getMaxHostesses,
    updateItemHostesses,
    updateItemRoom,
    insets,
    accentColor,
    borderColor,
    cardBg,
    textPrimary,
}) => {
    const currentConfigItem = activeConfigItem ? cart.find(i => i.product.id === activeConfigItem.productId) : null;
    const maxHostesses = currentConfigItem ? getMaxHostesses(currentConfigItem) : 0;

    return (
        <>
            {}
            <ClientSelectModal 
                visible={clientModalVisible}
                onClose={() => setClientModalVisible(false)}
                clients={clients as any}
                selectedIds={selectedClientId ? [selectedClientId] : []}
                onToggle={(id) => {
                    setSelectedClientId(selectedClientId === String(id) ? null : String(id));
                    setClientModalVisible(false);
                }}
            />

            {}
            <PremiumAlert 
                visible={clearCartAlertVisible}
                title="Vaciar Carrito"
                message="¿Estás seguro que deseas eliminar todos los productos del pedido? Esta acción no se puede deshacer."
                type="danger"
                showCancel
                confirmText="Sí, vaciar"
                cancelText="Cancelar"
                onConfirm={() => {
                    clearCart();
                    setClearCartAlertVisible(false);
                }}
                onCancel={() => setClearCartAlertVisible(false)}
            />

            {}
            <Modal visible={!!activeConfigItem} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg, paddingBottom: insets.bottom }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                {activeConfigItem?.type === 'hostess'
                                    ? `Asignar Anfitrionas (Máx ${maxHostesses})`
                                    : 'Seleccionar Habitación'}
                            </Text>
                            <Pressable onPress={() => setActiveConfigItem(null)}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalList}>
                            {activeConfigItem?.type === 'hostess' ? (
                                anfitrionas.map(a => {
                                    const isSelected = !!currentConfigItem?.selectedHostesses?.includes(Number(a.id));
                                    return (
                                        <Pressable
                                            key={a.id}
                                            onPress={() => {
                                                const current = currentConfigItem?.selectedHostesses || [];
                                                if (isSelected) {
                                                    updateItemHostesses(activeConfigItem.productId, current.filter((id: number) => id !== Number(a.id)));
                                                } else if (current.length < maxHostesses) {
                                                    updateItemHostesses(activeConfigItem.productId, [...current, Number(a.id)]);
                                                } else {
                                                    showToast({
                                                        type: 'error',
                                                        text1: 'Límite',
                                                        text2: `Máximo ${maxHostesses} anfitriona(s) para este producto.`,
                                                    });
                                                }
                                            }}
                                            style={[
                                                styles.modalItem, 
                                                { 
                                                    borderColor: isSelected ? accentColor : borderColor, 
                                                    backgroundColor: isSelected ? `${accentColor}15` : 'transparent' 
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.modalItemText, { color: textPrimary }]}>{a.nick || a.name}</Text>
                                            {isSelected && <Ionicons name="checkmark" size={16} color={accentColor} />}
                                        </Pressable>
                                    );
                                })
                            ) : (
                                <>
                                    <Pressable
                                        onPress={() => { updateItemRoom(activeConfigItem!.productId, null); setActiveConfigItem(null); }}
                                        style={[
                                            styles.modalItem, 
                                            { 
                                                borderColor: !currentConfigItem?.selectedRoom ? accentColor : borderColor, 
                                                backgroundColor: !currentConfigItem?.selectedRoom ? `${accentColor}15` : 'transparent' 
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.modalItemText, { color: textPrimary }]}>Sin Habitación</Text>
                                    </Pressable>
                                    {rooms.map(r => (
                                        <Pressable
                                            key={r.id}
                                            onPress={() => { updateItemRoom(activeConfigItem!.productId, r.id); setActiveConfigItem(null); }}
                                            style={[
                                                styles.modalItem, 
                                                { 
                                                    borderColor: currentConfigItem?.selectedRoom === r.id ? accentColor : borderColor, 
                                                    backgroundColor: currentConfigItem?.selectedRoom === r.id ? `${accentColor}15` : 'transparent' 
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.modalItemText, { color: textPrimary }]}>{r.name}</Text>
                                            {currentConfigItem?.selectedRoom === r.id && <Ionicons name="checkmark" size={16} color={accentColor} />}
                                        </Pressable>
                                    ))}
                                </>
                            )}
                        </ScrollView>

                        <Pressable onPress={() => setActiveConfigItem(null)} style={[styles.doneBtn, { backgroundColor: accentColor }]}>
                            <Text style={styles.doneBtnText}>Listo</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    modalList: { padding: 16 },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1.5 },
    modalItemText: { fontSize: 16, fontWeight: '600' },
    doneBtn: { margin: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    doneBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
