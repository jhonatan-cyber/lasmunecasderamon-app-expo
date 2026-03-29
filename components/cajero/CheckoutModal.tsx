import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TimeSelector } from "@/components/ui/TimeSelector";
import { Skeleton } from "@/components/ui/Skeleton";

interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPedido: any;
  pedidoDetails: any[];
  loadingDetails: boolean;
  selectedClient: any;
  metodoPago: "efectivo" | "tarjeta" | "transferencia" | "prepago" | "";
  setMetodoPago: (
    m: "efectivo" | "tarjeta" | "transferencia" | "prepago" | "",
  ) => void;
  metodoPagoAdicional: "efectivo" | "tarjeta" | "transferencia" | "";
  setMetodoPagoAdicional: (
    m: "efectivo" | "tarjeta" | "transferencia" | "",
  ) => void;
  agregarPropina: boolean;
  setAgregarPropina: (v: boolean) => void;
  selectedMinutesPedido: number;
  setSelectedMinutesPedido: (v: number) => void;
  submittingCheckout: boolean;
  onCheckoutSubmit: () => void;
  isDark: boolean;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose,
  selectedPedido,
  pedidoDetails,
  loadingDetails,
  selectedClient,
  metodoPago,
  setMetodoPago,
  metodoPagoAdicional,
  setMetodoPagoAdicional,
  agregarPropina,
  setAgregarPropina,
  selectedMinutesPedido,
  setSelectedMinutesPedido,
  submittingCheckout,
  onCheckoutSubmit,
  isDark,
  accentColor,
  accentBg,
  accentBorder,
  textPrimary,
  textSecondary,
  borderColor,
  cardBg,
}) => {
  if (!selectedPedido) return null;

  const mixedPaymentDetails = (() => {
    if (!selectedClient || metodoPago !== "prepago")
      return { isMixed: false, prepago: 0, adicional: 0 };
    const total =
      selectedPedido.total + (agregarPropina ? selectedPedido.total * 0.1 : 0);
    const saldo = Number(selectedClient.saldo || 0);
    if (saldo < total && saldo > 0) {
      return { isMixed: true, prepago: saldo, adicional: total - saldo };
    }
    return { isMixed: false, prepago: 0, adicional: 0 };
  })();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.checkoutModal,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <View style={styles.modalHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: accentBg }]}>
              <Ionicons name="card-outline" size={24} color={accentColor} />
            </View>
            <View>
              <Text style={[styles.modalTitleText, { color: textPrimary }]}>
                Cerrar Pedido
              </Text>
              <Text style={[styles.modalSubText, { color: textSecondary }]}>
                Codigo : {selectedPedido.codigo}
              </Text>
            </View>
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.optionsTitleContainer}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Resumen del Pedido
              </Text>
            </View>

            {loadingDetails ? (
              <View
                style={[
                  styles.orderMetaRow,
                  { borderColor, padding: 12, gap: 10 },
                ]}
              >
                <Skeleton
                  width={60}
                  height={40}
                  borderRadius={8}
                  style={{ flex: 1 }}
                />
                <Skeleton width={1} height={40} />
                <Skeleton
                  width={60}
                  height={40}
                  borderRadius={8}
                  style={{ flex: 1 }}
                />
                <Skeleton width={1} height={40} />
                <Skeleton
                  width={60}
                  height={40}
                  borderRadius={8}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              pedidoDetails.length > 0 && (
                <View style={[styles.orderMetaRow, { borderColor }]}>
                  <View style={styles.orderMetaItem}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={textSecondary}
                    />
                    <Text
                      style={[styles.orderMetaLabel, { color: textSecondary }]}
                    >
                      Garzón
                    </Text>
                    <Text
                      style={[styles.orderMetaValue, { color: textPrimary }]}
                    >
                      {pedidoDetails[0]?.garzon || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.orderMetaDivider,
                      { backgroundColor: borderColor },
                    ]}
                  />
                  <View style={styles.orderMetaItem}>
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color={textSecondary}
                    />
                    <Text
                      style={[styles.orderMetaLabel, { color: textSecondary }]}
                    >
                      Cliente
                    </Text>
                    <Text
                      style={[styles.orderMetaValue, { color: textPrimary }]}
                    >
                      {pedidoDetails[0]?.cliente || "Cliente sin registrar"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.orderMetaDivider,
                      { backgroundColor: borderColor },
                    ]}
                  />
                  <View style={styles.orderMetaItem}>
                    <Ionicons
                      name="bed-outline"
                      size={14}
                      color={textSecondary}
                    />
                    <Text
                      style={[styles.orderMetaLabel, { color: textSecondary }]}
                    >
                      Lugar
                    </Text>
                    <Text
                      style={[styles.orderMetaValue, { color: textPrimary }]}
                    >
                      {pedidoDetails[0]?.room_name || "Mesa/Salón"}
                    </Text>
                  </View>
                </View>
              )
            )}

            {pedidoDetails[0]?.room_id && (
              <View style={{ marginBottom: 20 }}>
                <TimeSelector
                  value={selectedMinutesPedido}
                  onChange={setSelectedMinutesPedido}
                  label="TIEMPO HABITACIÓN"
                />
              </View>
            )}

            <View
              style={[
                styles.receiptContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.02)",
                  borderColor,
                },
              ]}
            >
              {loadingDetails ? (
                <View style={{ gap: 12 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Skeleton width={40} height={40} borderRadius={8} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Skeleton width="100%" height={16} />
                        <Skeleton width="40%" height={12} />
                      </View>
                      <Skeleton width={60} height={20} />
                    </View>
                  ))}
                </View>
              ) : (
                pedidoDetails.map((item: any, idx: number) => (
                  <View key={idx} style={styles.productDetailRow}>
                    <View style={styles.productQuantityCol}>
                      <Text
                        style={[
                          styles.productQuantityLabel,
                          { color: textSecondary },
                        ]}
                      >
                        Cant.
                      </Text>
                      <Text
                        style={[styles.productQuantity, { color: textPrimary }]}
                      >
                        {item.cantidad}
                      </Text>
                    </View>
                    <View style={styles.productInfoCol}>
                      <Text
                        style={[styles.productName, { color: textPrimary }]}
                      >
                        {item.nombre_producto || item.producto || "Producto"}
                      </Text>
                      <Text
                        style={[styles.productPrice, { color: textSecondary }]}
                      >
                        ${(item.precio || 0).toLocaleString()}
                      </Text>
                    </View>
                    <Text
                      style={[styles.productSubtotal, { color: textPrimary }]}
                    >
                      $
                      {(
                        (item.precio || 0) * (item.cantidad || 0)
                      ).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.optionsTitleContainer}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Método de Pago
              </Text>
            </View>
            <View style={styles.paymentMethodsGrid}>
              {[
                "efectivo",
                "tarjeta",
                "transferencia",
                ...(selectedClient ? ["prepago"] : []),
              ].map((m: any) => {
                const isSelected = metodoPago === m;
                const isLockedPrepago =
                  m !== "prepago" && (selectedClient?.saldo || 0) > 0;
                const hasSaldo =
                  m === "prepago" &&
                  selectedClient &&
                  Number(selectedClient.saldo || 0) > 0;

                return (
                  <Pressable
                    key={m}
                    style={[
                      styles.payMethodBtn,
                      { borderColor: isSelected ? accentColor : borderColor },
                      isSelected && { backgroundColor: accentBg },
                      isLockedPrepago && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      if (isLockedPrepago) return;
                      setMetodoPago(m);
                      if (m !== "prepago") setMetodoPagoAdicional("");
                    }}
                  >
                    <Ionicons
                      name={
                        m === "efectivo"
                          ? "cash"
                          : m === "tarjeta"
                            ? "card"
                            : m === "prepago"
                              ? "wallet"
                              : "swap-horizontal"
                      }
                      size={24}
                      color={isSelected ? accentColor : textSecondary}
                    />
                    <Text
                      style={[
                        styles.payMethodLabel,
                        {
                          color: isSelected ? accentColor : textSecondary,
                          textTransform: "capitalize",
                        },
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mixedPaymentDetails.isMixed && (
              <View
                style={{
                  marginTop: 15,
                  padding: 15,
                  borderRadius: 16,
                  borderStyle: "dashed",
                  borderWidth: 1,
                  borderColor: accentColor,
                }}
              >
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 13,
                    fontWeight: "800",
                    marginBottom: 10,
                  }}
                >
                  PAGO MIXTO REQUERIDO
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={{ color: textSecondary, fontSize: 13 }}>
                    Saldo Prepago usado:
                  </Text>
                  <Text style={{ color: "#10B981", fontWeight: "800" }}>
                    -${mixedPaymentDetails.prepago.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 4 }]}>
                  <Text style={{ color: textSecondary, fontSize: 13 }}>
                    Restante a pagar:
                  </Text>
                  <Text style={{ color: textPrimary, fontWeight: "800" }}>
                    ${mixedPaymentDetails.adicional.toLocaleString()}
                  </Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text
                    style={{
                      color: textPrimary,
                      fontSize: 11,
                      fontWeight: "900",
                      marginBottom: 8,
                      letterSpacing: 0.5,
                    }}
                  >
                    MÉTODO PARA EL RESTANTE
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {["efectivo", "tarjeta", "transferencia"].map((m) => {
                      const isSel = metodoPagoAdicional === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setMetodoPagoAdicional(m as any)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: isSel ? accentColor : borderColor,
                            backgroundColor: isSel
                              ? `${accentColor}15`
                              : "transparent",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: isSel ? accentColor : textSecondary,
                              fontSize: 10,
                              fontWeight: "800",
                            }}
                          >
                            {m.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Propina - Mitad izquierda */}
              <Pressable
                style={[
                  styles.tipCheckboxContainer,
                  {
                    flex: 1,
                    borderColor: agregarPropina ? accentColor : borderColor,
                    backgroundColor: agregarPropina ? accentBg : "transparent",
                  },
                ]}
                onPress={() => setAgregarPropina(!agregarPropina)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: agregarPropina ? accentColor : textSecondary,
                      backgroundColor: agregarPropina
                        ? accentColor
                        : "transparent",
                    },
                  ]}
                >
                  {agregarPropina && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.tipText, { color: textPrimary }]}>
                    Propina (10%)
                  </Text>
                  <Text style={[styles.tipSubText, { color: textSecondary }]}>
                    +${(selectedPedido.total * 0.1).toLocaleString()}
                  </Text>
                </View>
              </Pressable>

              {/* Saldo Prepago - Mitad derecha */}
              {selectedClient && Number(selectedClient.saldo || 0) > 0 && (
                <View
                  style={[
                    styles.tipCheckboxContainer,
                    {
                      flex: 1,
                      borderColor: "#10B981",
                      backgroundColor: "#10B98115",
                    },
                  ]}
                >
                  <Ionicons name="wallet" size={20} color="#10B981" />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text
                      style={[
                        styles.tipText,
                        { color: "#10B981", fontSize: 11 },
                      ]}
                    >
                      Saldo prepago de {selectedClient.name}{" "}
                      {selectedClient.lastName}
                    </Text>
                    <Text style={[styles.tipSubText, { color: "#10B981" }]}>
                      ${Number(selectedClient.saldo || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.totalsBox, { backgroundColor: accentBg }]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: textSecondary }]}>
                  Subtotal
                </Text>
                <Text style={[styles.totalValue, { color: textPrimary }]}>
                  ${selectedPedido.total.toLocaleString()}
                </Text>
              </View>
              {agregarPropina && (
                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { color: textSecondary }]}>
                    Propina (10%)
                  </Text>
                  <Text style={[styles.totalValue, { color: accentColor }]}>
                    +${(selectedPedido.total * 0.1).toLocaleString()}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.totalRow,
                  {
                    marginTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: accentBorder,
                    paddingTop: 12,
                  },
                ]}
              >
                <Text style={[styles.finalLabel, { color: textPrimary }]}>
                  Monto Final
                </Text>
                <Text style={[styles.finalValue, { color: accentColor }]}>
                  $
                  {(
                    selectedPedido.total +
                    (agregarPropina ? selectedPedido.total * 0.1 : 0)
                  ).toLocaleString()}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActionsRow}>
            <Pressable
              style={[
                styles.modalBtnAction,
                {
                  backgroundColor: "transparent",
                  borderWidth: 2,
                  borderColor: accentColor,
                },
              ]}
              onPress={onClose}
              disabled={submittingCheckout}
            >
              <Text style={[styles.modalBtnActionText, { color: accentColor }]}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalBtnAction,
                {
                  backgroundColor: accentColor,
                  opacity: !metodoPago || submittingCheckout ? 0.6 : 1,
                },
              ]}
              onPress={onCheckoutSubmit}
              disabled={!metodoPago || submittingCheckout}
            >
              {submittingCheckout ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.modalBtnActionText, { color: "#FFFFFF" }]}>
                  Procesar Pago
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  checkoutModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    minHeight: 400,
    maxHeight: "90%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitleText: { fontSize: 22, fontWeight: "800" },
  modalSubText: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  optionsTitleContainer: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  orderMetaRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  orderMetaItem: { flex: 1, padding: 12, alignItems: "center", gap: 2 },
  orderMetaDivider: { width: 1 },
  orderMetaLabel: { fontSize: 10, fontWeight: "600" },
  orderMetaValue: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  receiptContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  productDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  productQuantityCol: { width: 44, alignItems: "center", marginRight: 12 },
  productQuantityLabel: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
  productQuantity: { fontSize: 16, fontWeight: "900" },
  productInfoCol: { flex: 1, justifyContent: "center", paddingRight: 8 },
  productName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  productPrice: { fontSize: 12, fontWeight: "600" },
  productSubtotal: { fontSize: 15, fontWeight: "800" },
  paymentMethodsGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  payMethodBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payMethodLabel: { fontSize: 13, fontWeight: "700" },
  tipCheckboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: { fontSize: 16, fontWeight: "700" },
  tipSubText: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  totalsBox: { padding: 16, borderRadius: 16, marginBottom: 24 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "800" },
  finalLabel: { fontSize: 18, fontWeight: "800" },
  finalValue: { fontSize: 24, fontWeight: "900" },
  modalActionsRow: { flexDirection: "row", gap: 12, marginTop: "auto" },
  modalBtnAction: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnActionText: { fontSize: 16, fontWeight: "800" },
});
