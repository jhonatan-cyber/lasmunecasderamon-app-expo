import React from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ProductsCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  category: any;
  products: any[];
  loading: boolean;
  quantities: { [key: number]: number };
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  onSetQuantity: (productId: number, qty: number) => void;
  onSelectProduct: (product: any) => void;
};

export function ProductsCategoryModal({
  visible,
  onClose,
  category,
  products,
  loading,
  quantities,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  onSetQuantity,
  onSelectProduct,
}: ProductsCategoryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContentWide, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {category?.name || "Productos"}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={26} color={textPrimary} />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={accentColor} size="large" />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => (item.id || item.id_producto).toString()}
              renderItem={({ item }) => {
                const id = item.id || item.id_producto;
                const qty = quantities[id] || 1;

                return (
                  <View
                    style={[
                      styles.modalProductRow,
                      { borderBottomColor: borderColor },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalProductName,
                          { color: textPrimary },
                        ]}
                      >
                        {item.nombre || item.name}
                      </Text>
                      <Text
                        style={[
                          styles.modalProductPrice,
                          { color: "#10B981" },
                        ]}
                      >
                        ${(item.precio ?? item.price ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.modalQuantityActions}>
                      <Pressable
                        style={[
                          styles.modalQtyBtn,
                          { backgroundColor: cardBg, borderColor },
                        ]}
                        onPress={() => onSetQuantity(id, Math.max(1, qty - 1))}
                      >
                        <Ionicons name="remove" size={16} color={textPrimary} />
                      </Pressable>
                      <Text style={[styles.modalQtyText, { color: textPrimary }]}>
                        {qty}
                      </Text>
                      <Pressable
                        style={[
                          styles.modalQtyBtn,
                          { backgroundColor: cardBg, borderColor },
                        ]}
                        onPress={() => onSetQuantity(id, qty + 1)}
                      >
                        <Ionicons name="add" size={16} color={textPrimary} />
                      </Pressable>
                    </View>
                    <Pressable
                      style={[
                        styles.modalAddBtn,
                        { backgroundColor: accentColor },
                      ]}
                      onPress={() => onSelectProduct(item)}
                    >
                      <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
          <Pressable
            style={[styles.confirmModalBtn, { backgroundColor: accentColor }]}
            onPress={onClose}
          >
            <Text style={styles.confirmModalBtnText}>Confirmar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContentWide: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  modalProductRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalProductName: { fontSize: 16, fontWeight: "800" },
  modalProductPrice: { fontSize: 14, fontWeight: "900", marginTop: 4 },
  modalQuantityActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  modalQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalQtyText: { fontSize: 16, fontWeight: "700", marginHorizontal: 12 },
  modalAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  confirmModalBtn: {
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  confirmModalBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
