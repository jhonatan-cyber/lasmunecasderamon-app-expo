import { IncludedServiceProductSelector } from "@/components/shared/IncludedServiceProductSelector";
import { BorderRadius } from "@/constants/spacing";
import { formColumn } from "@/constants/layout";
import { FontFamily } from "@/constants/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import { PaymentMethodSelect } from "@/components/cajero/forms/PaymentMethodSelect";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useNuevoServicio } from "@/hooks/useNuevoServicio";
import { NuevoServicioSkeleton } from "@/components/cajero/nuevo-servicio/NuevoServicioSkeleton";
import { BalanceModal } from "@/components/cajero/nuevo-servicio/BalanceModal";
import { PagosMixtosSection } from "@/components/cajero/nuevo-servicio/PagosMixtosSection";
import { CollapsibleCard, ServiceInfoCard, ServiceSummaryCard } from "@/components/cajero/nuevo-servicio/ServiceSummaryCard";
import { formatAmountInput } from "@/components/cajero/nuevo-servicio/helpers";
import { BaucherCard } from "@/components/cajero/nueva-venta/BaucherCard";

export default function NuevoServicioScreen() {
  const {
    accentColor,
    accentText,
    accentUi,
    accentOnSurface,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
  } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    productoIncluido,
    setProductoIncluido,
    state,
    dispatch,
    hasAnfitrionaComision,
    maxHostesses,
    maxClients,
    totals,
    desgloseTarjeta,
    selectedClientData,
    toggleHostess,
    toggleClient,
    handleLoadBalance,
    handleSubmit,
    handleMetodoPagoChange,
    baucherFoto,
    handleAttachBaucher,
    handleRemoveBaucher,
  } = useNuevoServicio();

  const {
    loadingInitial,
    anfitrionas,
    habitaciones,
    clientes,
    cajaAbierta,
    selectedHostesses,
    selectedClients,
    selectedHabitacion,
    precioServicio,
    metodoPago,
    pagosMixtos,
    submitting,
    hostessModalVisible,
    roomModalVisible,
    clientModalVisible,
    balanceModalVisible,
    balanceAmount,
    balanceSubmitting,
  } = state;

  const [formCollapsed, setFormCollapsed] = useState(false);
  const [showBottomCards, setShowBottomCards] = useState(true);
  const scrollYRef = useRef(0);
  const scrollThreshold = 30;

  const handleScroll = useCallback((e: any) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const prevY = scrollYRef.current;
    const diff = currentY - prevY;

    scrollYRef.current = currentY;

    // Detect scroll direction with threshold to avoid flickering
    if (diff > scrollThreshold) {
      // Scrolling down past threshold: hide cards
      setShowBottomCards(false);
    } else if (diff < -scrollThreshold) {
      // Scrolling up past threshold: show cards
      setShowBottomCards(true);
    } else if (currentY < scrollThreshold) {
      // At the top: always show cards
      setShowBottomCards(true);
    }
  }, []);

  // Always show cards if hostess and room are not selected (since they won't render anyway)
  const canShowBottomCards = selectedHostesses.length > 0 && !!selectedHabitacion;

  // Service info for breakdown card
  const anfitrionasNicks = selectedHostesses
    .map((id) => anfitrionas.find((a) => String(a.id) === String(id))?.nick)
    .filter(Boolean) as string[];
  const clienteNombre = selectedClientData
    ? `${selectedClientData.nombre || ""} ${selectedClientData.apellido || ""}`.trim()
    : "";

  const toggleFormCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormCollapsed((prev) => !prev);
  };

  if (loadingInitial)
    return (
      <NuevoServicioSkeleton
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
      />
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Nuevo Servicio"
        subtitle="Agendar servicio temporal"
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        <ScrollView
          style={{ flex: 1 }}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => handleScroll(e)}
          scrollEventThrottle={16}
          nestedScrollEnabled
        >
          <CollapsibleCard
            title="Formulario de Servicio"
            icon="document-text"
            iconColor={accentUi}
            collapsed={formCollapsed}
            onToggle={toggleFormCollapse}
            accentOnSurface={accentOnSurface}
            cardBg={cardBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          >
          <Text style={[styles.selectorLabel, { color: textSecondary }]}>Habitación (Requerido)</Text>
          <Pressable
            style={[styles.selectorBtn, { borderColor }]}
            onPress={() =>
              dispatch({
                type: "SET_MODAL_VISIBLE",
                modal: "room",
                visible: true,
              })
            }
            accessibilityLabel="Seleccionar habitación"
            accessibilityRole="button"
          >
            <Ionicons name="business" size={22} color={accentOnSurface} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedHabitacion?.nombre || "Seleccionar habitación"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          <Text style={[styles.selectorLabel, { color: textSecondary, marginTop: 12 }]}>Anfitrionas ({selectedHostesses.length}) (Requerido)</Text>
          <Pressable
            style={[styles.selectorBtn, { borderColor }]}
            onPress={() =>
              dispatch({
                type: "SET_MODAL_VISIBLE",
                modal: "hostess",
                visible: true,
              })
            }
            accessibilityLabel="Seleccionar anfitrionas"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={22} color={accentOnSurface} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedHostesses.length > 0
                  ? selectedHostesses
                      .map(
                        (id) =>
                          anfitrionas.find(
                            (a) => String(a.id) === String(id),
                          )?.nick,
                      )
                      .join(selectedHostesses.length > 1 ? ", " : "")
                  : "Seleccionar anfitrionas"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          <Text style={[styles.selectorLabel, { color: textSecondary, marginTop: 12 }]}>Clientes ({selectedClients.length}) (Opcional)</Text>
          <Pressable
            style={[styles.selectorBtn, { borderColor }]}
            onPress={() =>
              dispatch({
                type: "SET_MODAL_VISIBLE",
                modal: "client",
                visible: true,
              })
            }
            accessibilityLabel="Seleccionar clientes"
            accessibilityRole="button"
          >
            <Ionicons name="person" size={22} color={accentOnSurface} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedClients.length > 0
                  ? selectedClients
                      .map((id) => {
                        const cl = clientes.find(
                          (c) => String(c.id_cliente || c.id) === String(id),
                        );
                        return cl
                          ? `${cl.nombre || cl.name || ""} ${
                              cl.apellido || cl.last_name || ""
                            }`.trim()
                          : "Cliente";
                      })
                      .join(", ")
                  : "Seleccionar clientes"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          {}
          {!hasAnfitrionaComision && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.inputGroupLabel, { color: textSecondary }]}>PRECIO DE SERVICIO (Opcional)</Text>
              <View style={[styles.inputWrapper, { borderColor }]}>
                <Ionicons name="cash-outline" size={20} color={textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  value={precioServicio}
                  onChangeText={(val) => {
                    dispatch({
                      type: "SET_PRECIO_SERVICIO",
                      payload: formatAmountInput(val),
                    });
                  }}
                />
              </View>
            </View>
          )}

          {}
          {selectedClientData && (
            <View
              style={{
                marginTop: 16,
                marginBottom: 15,
                padding: 12,
                backgroundColor: `${accentColor}10`,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${accentColor}30`,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: textSecondary,
                      fontSize: 12,
                      fontFamily: FontFamily.bold,
                      textTransform: "uppercase",
                    }}
                  >
                    Saldo Prepago Cliente
                  </Text>
                  <Text
                    style={{
                      color: textPrimary,
                      fontSize: 20,
                      fontFamily: FontFamily.black,
                      marginTop: 2,
                    }}
                  >
                    ${(selectedClientData.saldo || 0).toLocaleString()}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    dispatch({
                      type: "SET_MODAL_VISIBLE",
                      modal: "balance",
                      visible: true,
                    })
                  }
                  style={{
                    backgroundColor: accentColor,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cargar saldo al cliente"
                >
                  <Text
                    style={{ color: "#FFF", fontFamily: FontFamily.bold, fontSize: 12 }}
                  >
                    CARGAR
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          </CollapsibleCard>

          {/* Método de pago y desglose: solo si hay anfitriona y habitación */}
          {canShowBottomCards && (
            <View style={{ opacity: showBottomCards ? 1 : 0, height: showBottomCards ? undefined : 0, overflow: 'hidden' }}>
              {/* Card de método de pago */}
              <CollapsibleCard
                title="Método de Pago"
                icon="card"
                iconColor={accentOnSurface}
                accentOnSurface={accentOnSurface}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <PaymentMethodSelect
                  showPrepago={Number(selectedClientData?.saldo || 0) > 0}
                  showMixto={true}
                  selectedMethod={metodoPago}
                  disabled={
                    !!(
                      selectedClientData &&
                      Number(selectedClientData.saldo || 0) >= totals.total &&
                      metodoPago !== "mixto"
                    )
                  }
                  disabledMethods={
                    Number(selectedClientData?.saldo || 0) <= 0 ? ["prepago"] : []
                  }
                  onSelect={handleMetodoPagoChange}
                />
                {metodoPago === "transferencia" && (
                  <BaucherCard
                    baucherFoto={baucherFoto}
                    accentColor={accentColor}
                    onAttach={handleAttachBaucher}
                    onRemove={handleRemoveBaucher}
                  />
                )}
                {metodoPago === "mixto" && (
                  <PagosMixtosSection
                    pagosMixtos={pagosMixtos}
                    totalsTotal={totals.total}
                    selectedClientSaldo={Number(selectedClientData?.saldo || 0)}
                    accentColor={accentColor}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onUpdatePago={(index, monto, display) =>
                      dispatch({ type: "UPDATE_PAGO_MIXTO", index, monto, display })
                    }
                    onRemovePago={(index) =>
                      dispatch({ type: "REMOVE_PAGO_MIXTO", index })
                    }
                    onAddPago={(metodo) =>
                      dispatch({
                        type: "ADD_PAGO_MIXTO",
                        payload: { metodo: metodo as any, monto: 0, display: "" },
                      })
                    }
                  />
                )}
              </CollapsibleCard>

              {hasAnfitrionaComision && (
                <IncludedServiceProductSelector
                  value={productoIncluido}
                  onChange={setProductoIncluido}
                />
              )}

              {/* Card de información del servicio + subtotales */}
              <ServiceInfoCard
                anfitrionasNicks={anfitrionasNicks}
                habitacionNombre={selectedHabitacion?.nombre ?? ""}
                tiempo={selectedHabitacion?.tiempo ?? 0}
                clienteNombre={clienteNombre}
                hasAnfitrionaComision={hasAnfitrionaComision}
                totals={totals}
                hostessCount={selectedHostesses.length}
                metodoPago={metodoPago}
                desgloseTarjeta={desgloseTarjeta}
                borderColor={borderColor}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                isDark={isDark}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer sticky con total y botón */}
        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 12 }]}>
          <ServiceSummaryCard
            totals={totals}
            hostessCount={selectedHostesses.length}
            selectedHabitacionNombre={selectedHabitacion?.nombre ?? ""}
            metodoPago={metodoPago}
            submitting={submitting}
            cajaAbierta={cajaAbierta}
            accentColor={accentColor}
            accentText={accentText}
            accentOnSurface={accentOnSurface}
            cardBg={cardBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            needsBaucher={metodoPago === "transferencia" || (metodoPago === "mixto" && pagosMixtos.some((p) => p.metodo === "transferencia"))}
            hasBaucher={!!baucherFoto}
            onSubmit={handleSubmit}
          />
        </View>
      </View>

      <RoomSelectModal
        visible={roomModalVisible}
        rooms={habitaciones.filter(
          (room) =>
            Number(room.precio ?? room.price ?? 0) > 0 ||
            Number(room.tiempo ?? room.time ?? 0) > 0 ||
            Number(room.comision_anfitriona ?? 0) > 0,
        )}
        selectedRoomId={
          selectedHabitacion?.id_habitacion || selectedHabitacion?.id
        }
        onClose={() =>
          dispatch({ type: "SET_MODAL_VISIBLE", modal: "room", visible: false })
        }
        onSelect={(room) => {
          dispatch({ type: "SET_SELECTED_HABITACION", payload: room });
          if ((room.comision_anfitriona ?? 0) > 0) {
            dispatch({ type: "SET_PRECIO_SERVICIO", payload: "0" });
          }
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "room",
            visible: false,
          });
        }}
      />

      <HostessSelectModal
        visible={hostessModalVisible}
        hostesses={anfitrionas}
        selectedIds={selectedHostesses}
        max={maxHostesses}
        onClose={() =>
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "hostess",
            visible: false,
          })
        }
        onToggle={toggleHostess}
      />

      <ClientSelectModal
        visible={clientModalVisible}
        clients={clientes}
        selectedIds={selectedClients}
        max={maxClients}
        onClose={() =>
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "client",
            visible: false,
          })
        }
        onToggle={toggleClient}
      />

      <BalanceModal
        visible={balanceModalVisible}
        balanceAmount={balanceAmount}
        balanceSubmitting={balanceSubmitting}
        selectedClientName={`${selectedClientData?.nombre ?? ""} ${
          selectedClientData?.apellido ?? ""
        }`.trim()}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        onClose={() =>
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "balance",
            visible: false,
          })
        }
        onAmountChange={(val) => {
          const clean = val.replace(/[^0-9]/g, "");
          dispatch({
            type: "SET_BALANCE_AMOUNT",
            payload:
              clean === ""
                ? ""
                : parseInt(clean).toLocaleString("es-CL").replace(/,/g, "."),
          });
        }}
        onConfirm={handleLoadBalance}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  scrollContent: { ...formColumn, padding: 16, flexGrow: 0 },
  stickyFooter: {
    ...formColumn,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FontFamily.black,
    marginBottom: 20,
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 9999,
    borderWidth: 1,
  },
  selectorLabel: { fontSize: 12, fontFamily: FontFamily.bold },
  selectorVal: { fontSize: 15, fontFamily: FontFamily.extrabold, marginTop: 2 },
  inputGroupLabel: {
    fontSize: 12,
    fontFamily: FontFamily.extrabold,
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 54,
  },
  textInput: { flex: 1, marginLeft: 10, fontSize: 18, fontFamily: FontFamily.bold },
  backBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
