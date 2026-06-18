import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { ServiceSummaryCard } from "@/components/cajero/nuevo-servicio/ServiceSummaryCard";
import { formatAmountInput } from "@/components/cajero/nuevo-servicio/helpers";

export default function NuevoServicioScreen() {
  const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const router = useRouter();

  const {
    state,
    dispatch,
    hasAnfitrionaComision,
    maxHostesses,
    maxClients,
    numericPrecioServicio,
    totals,
    desgloseTarjeta,
    selectedClientData,
    toggleHostess,
    toggleClient,
    handleLoadBalance,
    handleSubmit,
    handleMetodoPagoChange,
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



  if (loadingInitial)
    return <NuevoServicioSkeleton bg={bg} cardBg={cardBg} borderColor={borderColor} />;

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
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Formulario de Servicio
          </Text>

          {/* Room Selector */}
          <Pressable
            style={[styles.selectorBtn, { borderColor }]}
            onPress={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "room", visible: true })}
            accessibilityLabel="Seleccionar habitación"
            accessibilityRole="button"
          >
            <Ionicons name="business" size={22} color={accentColor} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorLabel, { color: textSecondary }]}>
                Habitación (Requerido)
              </Text>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedHabitacion?.nombre || "Seleccionar habitación"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          {/* Hostess Selector */}
          <Pressable
            style={[styles.selectorBtn, { borderColor, marginTop: 12 }]}
            onPress={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "hostess", visible: true })}
            accessibilityLabel="Seleccionar anfitrionas"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={22} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorLabel, { color: textSecondary }]}>
                Anfitrionas ({selectedHostesses.length})
              </Text>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedHostesses.length > 0
                  ? selectedHostesses
                      .map(
                        (id) =>
                          anfitrionas.find(
                            (a) => String(a.id_usuario || a.id) === String(id),
                          )?.nick,
                      )
                      .join(", ")
                  : "Seleccionar anfitrionas"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          {/* Client Selector */}
          <Pressable
            style={[styles.selectorBtn, { borderColor, marginTop: 12 }]}
            onPress={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "client", visible: true })}
            accessibilityLabel="Seleccionar clientes"
            accessibilityRole="button"
          >
            <Ionicons name="person" size={22} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorLabel, { color: textSecondary }]}>
                Clientes ({selectedClients.length})
              </Text>
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
                  : "Seleccionar clientes (Opcional)"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          {/* Service Price Input */}
          {!hasAnfitrionaComision && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.inputGroupLabel, { color: textSecondary }]}>
                PRECIO DE SERVICIO
              </Text>
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

          {/* Client Balance */}
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
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    Saldo Prepago Cliente
                  </Text>
                  <Text
                    style={{
                      color: textPrimary,
                      fontSize: 20,
                      fontWeight: "900",
                      marginTop: 2,
                    }}
                  >
                    ${(selectedClientData.saldo || 0).toLocaleString()}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    dispatch({ type: "SET_MODAL_VISIBLE", modal: "balance", visible: true })
                  }
                  style={{
                    backgroundColor: accentColor,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>
                    CARGAR
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <PaymentMethodSelect
            showPrepago={!!selectedClientData}
            showMixto={true}
            selectedMethod={metodoPago}
            disabled={
              !!(
                selectedClientData &&
                Number(selectedClientData.saldo || 0) >= totals.total &&
                metodoPago !== "mixto"
              )
            }
            disabledMethods={Number(selectedClientData?.saldo || 0) <= 0 ? ["prepago"] : []}
            onSelect={handleMetodoPagoChange}
          />

          {/* Pagos Mixtos UI */}
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
              isDark={isDark}
              onUpdatePago={(index, monto, display) =>
                dispatch({ type: "UPDATE_PAGO_MIXTO", index, monto, display })
              }
              onRemovePago={(index) => dispatch({ type: "REMOVE_PAGO_MIXTO", index })}
              onAddPago={(metodo) =>
                dispatch({
                  type: "ADD_PAGO_MIXTO",
                  payload: { metodo: metodo as any, monto: 0, display: "" },
                })
              }
            />
          )}
        </View>

        <ServiceSummaryCard
          hasAnfitrionaComision={hasAnfitrionaComision}
          totals={totals}
          comisionAnfitriona={selectedHabitacion?.comision_anfitriona ?? 0}
          hostessCount={selectedHostesses.length}
          selectedHabitacionNombre={selectedHabitacion?.nombre ?? ""}
          metodoPago={metodoPago}
          desgloseTarjeta={desgloseTarjeta}
          submitting={submitting}
          cajaAbierta={cajaAbierta}
          accentColor={accentColor}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isDark={isDark}
          onSubmit={handleSubmit}
        />
      </ScrollView>

      <RoomSelectModal
        visible={roomModalVisible}
        rooms={habitaciones.filter(
          (room) =>
            Number(room.precio ?? room.price ?? 0) > 0 ||
            Number(room.tiempo ?? room.time ?? 0) > 0 ||
            Number(room.comision_anfitriona ?? 0) > 0,
        )}
        selectedRoomId={selectedHabitacion?.id_habitacion || selectedHabitacion?.id}
        onClose={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "room", visible: false })}
        onSelect={(room) => {
          dispatch({ type: "SET_SELECTED_HABITACION", payload: room });
          if ((room.comision_anfitriona ?? 0) > 0) {
            dispatch({ type: "SET_PRECIO_SERVICIO", payload: "0" });
          }
          dispatch({ type: "SET_MODAL_VISIBLE", modal: "room", visible: false });
        }}
      />

      <HostessSelectModal
        visible={hostessModalVisible}
        hostesses={anfitrionas}
        selectedIds={selectedHostesses}
        max={maxHostesses}
        onClose={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "hostess", visible: false })}
        onToggle={toggleHostess}
      />

      <ClientSelectModal
        visible={clientModalVisible}
        clients={clientes}
        selectedIds={selectedClients}
        max={maxClients}
        onClose={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "client", visible: false })}
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
        isDark={isDark}
        onClose={() => dispatch({ type: "SET_MODAL_VISIBLE", modal: "balance", visible: false })}
        onAmountChange={(val) => {
          const clean = val.replace(/[^0-9]/g, "");
          dispatch({
            type: "SET_BALANCE_AMOUNT",
            payload: clean === "" ? "" : parseInt(clean).toLocaleString("es-CL").replace(/,/g, "."),
          });
        }}
        onConfirm={handleLoadBalance}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
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
  selectorLabel: { fontSize: 12, fontWeight: "700" },
  selectorVal: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  inputGroupLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  textInput: { flex: 1, marginLeft: 10, fontSize: 18, fontWeight: "700" },
  backBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
});
