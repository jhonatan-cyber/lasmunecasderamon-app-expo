import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import FlashList from "@/components/shared/FlashList";
import { Ionicons } from '@expo/vector-icons';
import { getHostessLimit } from '@/hooks/utils/cuentaUtils';
import { useRenderCount } from "@/hooks/useRenderCount";

interface CategoryProductsModalProps {
  visible: boolean;
  categoria: any;
  loading: boolean;
  products: any[];
  quantities: { [key: number]: number };
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onClose: () => void;
  onSetQuantity: (productId: number, quantity: number) => void;
  onSetHostessTarget: (target: any) => void;
  addProductToCart: (product: any) => void;
  isChampagneProduct: (product: any) => boolean;
}

export const CategoryProductsModal = React.memo(function CategoryProductsModal({
  visible,
  categoria,
  loading,
  products,
  quantities,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  onClose,
  onSetQuantity,
  onSetHostessTarget,
  addProductToCart,
  isChampagneProduct,
}: CategoryProductsModalProps) {
  useRenderCount('CategoryProductsModal', { visible, productCount: products.length });
  return (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContentWide, { backgroundColor: cardBg }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>
            {categoria?.name || 'Productos'}
          </Text>
          <Pressable onPress={onClose} accessibilityLabel="Cerrar modal" accessibilityRole="button">
            <Ionicons name="close" size={26} color={textPrimary} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={accentColor} size="large" />
        ) : (
          <FlashList
            data={products}
            keyExtractor={(item: any) => (item.id || item.id_producto).toString()}
            estimatedItemSize={80}
            renderItem={({ item }: { item: any }) => {
              const id = item.id || item.id_producto;
              const qty = quantities[id] || 1;
              return (
                <View style={[styles.productRow, { borderBottomColor: borderColor }]}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: textPrimary }]}>
                      {item.nombre || item.name}
                    </Text>
                    <Text style={[styles.productPrice, { color: '#10B981' }]}>
                      ${(item.precio ?? item.price ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.quantityActions}>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: cardBg, borderColor }]}
                      onPress={() => onSetQuantity(id, Math.max(1, qty - 1))}
                    >
                      <Ionicons name="remove" size={16} color={textPrimary} />
                    </Pressable>
                    <Text style={[styles.qtyText, { color: textPrimary }]}>
                      {qty}
                    </Text>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: cardBg, borderColor }]}
                      onPress={() => onSetQuantity(id, qty + 1)}
                    >
                      <Ionicons name="add" size={16} color={textPrimary} />
                    </Pressable>
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    onPress={() => {
                      const hasComm = Number(item.comision || item.commission || 0) > 0;
                      if (hasComm) {
                        onSetHostessTarget({
                          productId: id,
                          product: item,
                          max: getHostessLimit(item, qty),
                          isChampagne: isChampagneProduct(item),
                        });
                      } else {
                        addProductToCart(item);
                      }
                    }}
                    accessibilityLabel={`Añadir ${item.nombre}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            }}
          />
        )}

        <Pressable
          style={[styles.confirmBtn, { backgroundColor: accentColor }]}
          onPress={onClose}
          accessibilityLabel="Confirmar selección de productos"
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>Confirmar</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
  );
});
CategoryProductsModal.displayName = 'CategoryProductsModal';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentWide: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  quantityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 2,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  confirmBtn: {
    height: 56,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#E11D48',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
