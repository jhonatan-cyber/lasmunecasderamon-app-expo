import { Skeleton } from "@/components/ui/Skeleton";
import { TimeSelector } from "@/components/ui/TimeSelector";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useConfigValue } from "@/hooks/useConfigValue";
import { calcularPropina, calcularCargoTarjeta } from '@lasmunecasderamon/sale-totals';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MetodoPago } from '../../types/api';

interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPedido: any;
  pedidoDetails: any[];
  loadingDetails: boolean;
  selectedClient: any;
  metodoPago: MetodoPago;
  setMetodoPago: (m: MetodoPago) => void;
  metodoPagoAdicional: MetodoPago;
  setMetodoPagoAdicional: (m: MetodoPago) => void;
  agregarPropina: boolean;
  setAgregarPropina: (v: boolean) => void;
  selectedMinutesPedido: number;
  setSelectedMinutesPedido: (v: number) => void;
  submittingCheckout: boolean;
  onCheckoutSubmit: () => void;
  onAddToCuenta?: () => void;
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
  visible, onClose, selectedPedido, pedidoDetails, loadingDetails, selectedClient,
  metodoPago, setMetodoPago, metodoPagoAdicional, setMetodoPagoAdicional,
  agregarPropina, setAgregarPropina, selectedMinutesPedido, setSelectedMinutesPedido,
  submittingCheckout, onCheckoutSubmit, onAddToCuenta,
  isDark, accentColor, accentBg, accentBorder, textPrimary, textSecondary, borderColor, cardBg,
}) => {
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  const impuestoPropinaPct = Number(useConfigValue('facturacion', 'impuesto_propina', '10'));

  if (!selectedPedido) return null;

  const existingTip = Number(selectedPedido.propina || pedidoDetails?.[0]?.propina || 0);
  const subtotalBase = Number(
    selectedPedido.subtotal ?? Math.max(0, Number(selectedPedido.total || 0) - existingTip)
  );
  const tipAmount = existingTip > 0 ? existingTip : calcularPropina(subtotalBase, propinaPct, agregarPropina);
  // Cargo por pago con tarjeta: línea aparte en la boleta, se suma al total
  // que paga el cliente pero NO se reparte (solo `tipAmount` va como propina).
  const cargoTarjeta = calcularCargoTarjeta(subtotalBase, impuestoPropinaPct, metodoPago);
  const totalFinal = subtotalBase + tipAmount + cargoTarjeta;

  const mixedPaymentDetails = (() => {
    if (!selectedClient || metodoPago !== "prepago") return { isMixed: false, prepago: 0, adicional: 0 };
    const total = totalFinal;
    const saldo = Number(selectedClient.saldo || 0);
    if (saldo < total && saldo > 0) return { isMixed: true, prepago: saldo, adicional: total - saldo };
    return { isMixed: false, prepago: 0, adicional: 0 };
  })();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.header, { backgroundColor: accentBg }]}>
            <Ionicons name="card-outline" size={24} color={accentColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>Cerrar Pedido</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>Codigo: {selectedPedido.codigo}</Text>
            </View>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Resumen del Pedido</Text>
            
            {loadingDetails ? (
              <View style={[styles.metaRow, { borderColor }]}>
                <Skeleton width={60} height={40} /><Skeleton width={1} height={40} />
                <Skeleton width={60} height={40} /><Skeleton width={1} height={40} />
                <Skeleton width={60} height={40} />
              </View>
            ) : pedidoDetails.length > 0 && (
              <View style={[styles.metaRow, { borderColor }]}>
                <View style={styles.metaItem}><Ionicons name="person-outline" size={14} color={textSecondary} /><Text style={[styles.metaLabel, { color: textSecondary }]}>Garzón</Text><Text style={[styles.metaValue, { color: textPrimary }]}>{pedidoDetails[0]?.garzon || "N/A"}</Text></View>
                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                <View style={styles.metaItem}><Ionicons name="people-outline" size={14} color={textSecondary} /><Text style={[styles.metaLabel, { color: textSecondary }]}>Cliente</Text><Text style={[styles.metaValue, { color: textPrimary }]}>{pedidoDetails[0]?.cliente || "Sin registrar"}</Text></View>
                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                <View style={styles.metaItem}><Ionicons name="bed-outline" size={14} color={textSecondary} /><Text style={[styles.metaLabel, { color: textSecondary }]}>Lugar</Text><Text style={[styles.metaValue, { color: textPrimary }]}>{pedidoDetails[0]?.room_name || "Mesa"}</Text></View>
              </View>
            )}

            {pedidoDetails[0]?.room_id && <View style={{ marginBottom: 16 }}><TimeSelector value={selectedMinutesPedido} onChange={setSelectedMinutesPedido} label="TIEMPO HABITACIÓN" /></View>}

            <View style={[styles.receipt, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor }]}>
              {loadingDetails ? [1,2,3].map(i => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}><Skeleton width={40} height={40} /><View style={{ flex: 1 }}><Skeleton width="100%" height={16} /><Skeleton width="40%" height={12} /></View><Skeleton width={60} height={20} /></View>) : pedidoDetails.map((item: any, idx: number) => (
                <View key={idx} style={styles.productRow}>
                  <View style={styles.qtyCol}><Text style={[styles.qtyLabel, { color: textSecondary }]}>Cant.</Text><Text style={[styles.qty, { color: textPrimary }]}>{item.cantidad}</Text></View>
                  <View style={styles.prodCol}><Text style={[styles.prodName, { color: textPrimary }]}>{item.nombre_producto || item.producto || "Producto"}</Text><Text style={[styles.prodPrice, { color: textSecondary }]}>${(item.precio || 0).toLocaleString()}</Text></View>
                  <Text style={[styles.prodSubtotal, { color: textPrimary }]}>${((item.precio || 0) * (item.cantidad || 0)).toLocaleString()}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Método de Pago</Text>
            <View style={styles.paymentGrid}>
              {["efectivo", "tarjeta", "transferencia", ...(selectedClient ? ["prepago"] : [])].map((m: any) => {
                const isSelected = metodoPago === m;
                return (
                  <Pressable key={m} style={[styles.payBtn, { borderColor: isSelected ? accentColor : borderColor }, isSelected && { backgroundColor: accentBg }]} onPress={() => { setMetodoPago(m); if (m !== "prepago") setMetodoPagoAdicional(""); }}>
                    <Ionicons name={m === "efectivo" ? "cash" : m === "tarjeta" ? "card" : m === "prepago" ? "wallet" : "swap-horizontal"} size={24} color={isSelected ? accentColor : textSecondary} />
                    <Text style={[styles.payLabel, { color: isSelected ? accentColor : textSecondary }]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>

            {mixedPaymentDetails.isMixed && (
              <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderStyle: "dashed", borderWidth: 1, borderColor }}>
                <Text style={{ color: textPrimary, fontWeight: "800", marginBottom: 8 }}>PAGO MIXTO</Text>
                <View style={styles.row}><Text style={{ color: textSecondary }}>Prepago:</Text><Text style={{ color: "#10B981", fontWeight: "800" }}>-${mixedPaymentDetails.prepago.toLocaleString()}</Text></View>
                <View style={styles.row}><Text style={{ color: textSecondary }}>Restante:</Text><Text style={{ color: textPrimary, fontWeight: "800" }}>${mixedPaymentDetails.adicional.toLocaleString()}</Text></View>
              </View>
            )}

            <View style={[styles.totals, { backgroundColor: accentBg }]}>
              <View style={styles.row}><Text style={{ color: textSecondary }}>Subtotal</Text><Text style={{ color: textPrimary, fontWeight: "800" }}>${subtotalBase.toLocaleString()}</Text></View>
              {cargoTarjeta > 0 && <View style={styles.row}><Text style={{ color: textSecondary }}>Cargo tarjeta ({impuestoPropinaPct}%)</Text><Text style={{ color: accentColor, fontWeight: "800" }}>+${cargoTarjeta.toLocaleString()}</Text></View>}
              {tipAmount > 0 && <View style={styles.row}><Text style={{ color: textSecondary }}>{existingTip > 0 ? 'Propina incluida' : `Propina ${propinaPct}%`}</Text><Text style={{ color: accentColor, fontWeight: "800" }}>+${tipAmount.toLocaleString()}</Text></View>}
              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: accentBorder, paddingTop: 8, marginTop: 8 }]}><Text style={[styles.totalLabel, { color: textPrimary }]}>Total</Text><Text style={[styles.totalValue, { color: accentColor }]}>${totalFinal.toLocaleString()}</Text></View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.btnRow}>
              <Pressable style={[styles.btn, { borderWidth: 2, borderColor }]} onPress={onClose} disabled={submittingCheckout}>
                <Text style={[styles.btnText, { color: textSecondary }]}>Cancelar</Text>
              </Pressable>
              {selectedClient && onAddToCuenta && (
                <Pressable style={[styles.btn, { backgroundColor: "#7C3AED" }]} onPress={onAddToCuenta} disabled={submittingCheckout}>
                  {submittingCheckout ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.btnText, { color: "#FFF" }]}>Cuenta</Text>}
                </Pressable>
              )}
              <Pressable style={[styles.btn, { backgroundColor: accentColor, opacity: !metodoPago || submittingCheckout ? 0.5 : 1 }]} onPress={onCheckoutSubmit} disabled={!metodoPago || submittingCheckout}>
                {submittingCheckout ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.btnText, { color: "#FFF" }]}>Venta</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  metaRow: { flexDirection: "row", borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  metaItem: { flex: 1, padding: 10, alignItems: "center", gap: 2 },
  metaLabel: { fontSize: 10, fontWeight: "600" },
  metaValue: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  divider: { width: 1 },
  receipt: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  productRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  qtyCol: { width: 44 },
  qtyLabel: { fontSize: 10, fontWeight: "600" },
  qty: { fontSize: 16, fontWeight: "900" },
  prodCol: { flex: 1 },
  prodName: { fontSize: 14, fontWeight: "700" },
  prodPrice: { fontSize: 12 },
  prodSubtotal: { fontSize: 14, fontWeight: "800" },
  paymentGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  payBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, alignItems: "center", gap: 4 },
  payLabel: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totals: { padding: 16, borderRadius: 12, marginBottom: 10 },
  totalLabel: { fontSize: 18, fontWeight: "800" },
  totalValue: { fontSize: 20, fontWeight: "900" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.1)" },
  btnRow: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 48 },
  btnText: { fontSize: 14, fontWeight: "700" },
});
