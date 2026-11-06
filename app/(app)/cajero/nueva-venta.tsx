import { individualShorts } from "@/hooks/utils/individualShorts";
import { useCartDraft } from "@/hooks/useCartDraft";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { CartList } from "@/components/cajero/forms/CartList";
import { CategorySelector } from "@/components/cajero/forms/CategorySelector";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { NuevaVentaHostessModal } from "@/components/cajero/nueva-venta/NuevaVentaHostessModal";
import { PaymentMethodSelect } from "@/components/cajero/forms/PaymentMethodSelect";
import { NuevaVentaModals } from "@/components/cajero/nueva-venta/NuevaVentaModals";
import { NuevaVentaSearch } from "@/components/cajero/nueva-venta/NuevaVentaSearch";
import { CajaClosedBanner } from "@/components/cajero/CajaClosedBanner";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { TimeSelector } from "@/components/ui/TimeSelector";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { TipCheckbox } from "@/components/cajero/forms/TipCheckbox";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useNuevaVenta } from "@/hooks/useNuevaVenta";
import { useConfigValue } from "@/hooks/useConfigValue";
import { getCardSplit } from "@/hooks/utils/cuentaUtils";
import { NuevaVentaSkeleton } from "@/components/cajero/nueva-venta/NuevaVentaSkeleton";
import { adjuntarBaucher } from "@/utils/baucherPicker";

export default function NuevaVentaScreen() {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
  } = useAccentColor();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const splitVentaPct = Number(
    useConfigValue("comisiones", "split_tarjeta_venta", "51"),
  );
  const splitPropinaPct = Number(
    useConfigValue("comisiones", "split_tarjeta_propina", "49"),
  );

  const {
    state,
    dispatch,
    totals,
    servicioId,
    servicioAnfitrionas,
    servicioNombre,
    hasCommissionItem,
    fromCache,
    onRefresh,
    refreshCajaStatus,
    handleLoadPrepago,
    handleOpenCategory,
    handlePressAddProduct,
    addProductToCart,
    removeFromCart,
    updateQuantity,
    handleSubmit,
    handleToggleHostess,
    searchProducto,
    setSearchProducto,
    searchResults,
    searchLoading,
    handleSearchNow,
    handleClearSearch,
  } = useNuevaVenta();
  const clearDraft = useCartDraft(
    `sales:${servicioId || "general"}`,
    state.cart,
    (saved) => dispatch({ type: "SET_CART", payload: saved }),
  );

  const {
    loadingInitial,
    refreshing,
    anfitrionas,
    habitaciones,
    clientes,
    cajaAbierta,
    cart,
    selectedCliente,
    selectedSegundoCliente,
    selectedHabitacion,
    metodoPago,
    enableTip,
    selectedTime,
    categories,
    modalOpen,
    modalCategoria,
    modalProducts,
    modalLoading,
    modalHostessSelections,
    hostessSelectionTarget,
    hostessSubModalVisible,
    roomModalVisible,
    clientModalVisible,
    submitting,
    loadModalVisible,
    loadingAmount,
    loadingTargetClient,
    loadSubmitting,
    loadMetodoPago,
  } = state;

  /** Foto del baucher en data URL; se exige con transferencia al finalizar. */
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [clientSelectionTarget, setClientSelectionTarget] = useState<"primary" | "secondary">("primary");
  const handleAdjuntarBaucher = useCallback(async () => {
    const dataUrl = await adjuntarBaucher("NuevaVenta:baucher");
    if (dataUrl) setBaucherFoto(dataUrl);
  }, []);

  const firstCajaFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstCajaFocus.current) {
        firstCajaFocus.current = false;
        return;
      }
      void refreshCajaStatus();
    }, [refreshCajaStatus]),
  );

  const spacing = isTablet ? 24 : 16;
  const borderRadius = isTablet ? 28 : 24;
  const dynamicStyles = {
    scrollContent: { padding: spacing, paddingBottom: 100 },
    section: { padding: spacing, borderRadius, marginBottom: spacing },
    summaryCard: { padding: spacing + 8, borderRadius: borderRadius + 4 },
    submitBtn: { height: isTablet ? 70 : 60, borderRadius: isTablet ? 24 : 20 },
    selectorBtn: {
      padding: isTablet ? 18 : 14,
      borderRadius: isTablet ? 20 : 16,
    },
  };

  if (loadingInitial)
    return (
      <NuevaVentaSkeleton
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        spacing={spacing}
      />
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Nueva Venta"
        subtitle={
          fromCache
            ? "Datos guardados en el dispositivo"
            : "Registrar productos y servicios"
        }
        connectionStatus={
          fromCache ? { isConnected: false, label: "Modo Offline" } : undefined
        }
        rightComponent={
          <Pressable
            onPress={() => {
              clearDraft();
              dispatch({ type: "SET_CART", payload: [] });
              router.back();
            }}
            style={styles.backBtnRight}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </Pressable>
        }
      />
      <OfflineStatusBanner
        pendientesHref={"/(app)/cajero/pendientes" as never}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          dynamicStyles.scrollContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {cajaAbierta === false && <CajaClosedBanner />}

        <NuevaVentaSearch
          searchProducto={searchProducto}
          onSearchChange={setSearchProducto}
          onSearchNow={handleSearchNow}
          onClearSearch={handleClearSearch}
          searchLoading={searchLoading}
          searchResults={searchResults}
          onAddProduct={handlePressAddProduct}
          accentColor={accentColor}
          cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />

        <CategorySelector
          categories={categories}
          onSelectCategory={handleOpenCategory}
        />

        <View
          style={[
            styles.section,
            dynamicStyles.section,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: textPrimary, fontSize: isTablet ? 16 : 13 },
            ]}
          >
            2. Detalles de la Venta
          </Text>
          {servicioId && (
            <Text style={{ color: textPrimary, padding: 12 }}>
              Venta adicional · {servicioNombre || "Cargando habitación…"}
              {"\n"}
              Los cambios de anfitrionas se aplicarán al privado al registrar la
              venta.
            </Text>
          )}
          {hasCommissionItem && (
            <Pressable
              style={[
                styles.selectorBtn,
                dynamicStyles.selectorBtn,
                { borderColor },
              ]}
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
              <Ionicons name="business" size={20} color={accentColor} />
              <Text
                style={[
                  styles.selectorText,
                  { color: textPrimary, marginLeft: 10 },
                ]}
              >
                {selectedHabitacion?.nombre || "Seleccionar Habitación"}
              </Text>
            </Pressable>
          )}
          {selectedHabitacion && (
            <View style={{ marginTop: spacing / 2 }}>
              <TimeSelector
                value={selectedTime}
                onChange={(t) =>
                  dispatch({ type: "SET_SELECTED_TIME", payload: t })
                }
                step={5}
                min={5}
                max={60}
                label="Tiempo (minutos)"
              />
            </View>
          )}
          <Pressable
            style={[
              styles.selectorBtn,
              dynamicStyles.selectorBtn,
              { borderColor, marginTop: hasCommissionItem ? spacing / 2 : 0 },
            ]}
            onPress={() =>
              {
                setClientSelectionTarget("primary");
                dispatch({
                  type: "SET_MODAL_VISIBLE",
                  modal: "client",
                  visible: true,
                });
              }
            }
            accessibilityLabel="Seleccionar cliente"
            accessibilityRole="button"
          >
            <Ionicons name="person" size={20} color={accentColor} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.selectorText, { color: textPrimary }]}>
                {selectedCliente
                  ? (
                    (selectedCliente.nombre || selectedCliente.name || "") +
                    " " +
                    (selectedCliente.apellido ||
                      selectedCliente.lastName ||
                      selectedCliente.last_name ||
                      "")
                  ).trim() || "Cliente Seleccionado"
                  : "Seleccionar Cliente"}
              </Text>
              {selectedCliente && (
                <View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: accentColor,
                      fontWeight: "700",
                      marginTop: 2,
                    }}
                  >
                    Saldo Prepago: $
                    {Number(
                      selectedCliente.saldo ??
                      (selectedCliente as any).saldo_prepago ??
                      0,
                    ).toLocaleString()}
                  </Text>
                  {(selectedCliente as any).metodo_pago && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: textSecondary,
                        fontWeight: "600",
                        marginTop: 1,
                      }}
                    >
                      Cargado con:{" "}
                      {String(
                        (selectedCliente as any).metodo_pago,
                      ).toUpperCase()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Pressable>
          {metodoPago === "prepago" &&
            clientes.some((cliente) => {
              const id = String(cliente.id_cliente ?? cliente.id);
              const primaryId = String(selectedCliente?.id_cliente ?? selectedCliente?.id ?? "");
              return id !== primaryId &&
                Number(cliente.saldo ?? (cliente as any).saldo_prepago ?? 0) > 0;
            }) && (
              <View style={{ marginTop: spacing / 2 }}>
                <Pressable
                  style={[
                    styles.selectorBtn,
                    dynamicStyles.selectorBtn,
                    { borderColor: selectedSegundoCliente ? accentColor : borderColor },
                  ]}
                  onPress={() => {
                    if (selectedSegundoCliente) {
                      dispatch({ type: "SET_SELECTED_SEGUNDO_CLIENTE", payload: null });
                    } else {
                      setClientSelectionTarget("secondary");
                      dispatch({ type: "SET_MODAL_VISIBLE", modal: "client", visible: true });
                    }
                  }}
                >
                  <Ionicons
                    name={selectedSegundoCliente ? "people" : "person-add"}
                    size={20}
                    color={accentColor}
                  />
                  <Text style={[styles.selectorText, { color: textPrimary, marginLeft: 10 }]}>
                    {selectedSegundoCliente
                      ? `${selectedSegundoCliente.nombre || selectedSegundoCliente.name || ""} ${selectedSegundoCliente.apellido || selectedSegundoCliente.lastName || ""}`.trim()
                      : "Repartir prepago con otro cliente"}
                  </Text>
                </Pressable>
              </View>
            )}
          <PaymentMethodSelect
            selectedMethod={metodoPago}
            onSelect={(val) => {
              if (val !== "transferencia") setBaucherFoto(null);
              dispatch({ type: "SET_METODO_PAGO", payload: val as any });
            }}
            showPrepago={
              !!selectedCliente &&
              Number(
                selectedCliente.saldo ??
                (selectedCliente as any).saldo_prepago ??
                0,
              ) > 0
            }
            disabledMethods={
              selectedCliente &&
                Number(
                  selectedCliente.saldo ??
                  (selectedCliente as any).saldo_prepago ??
                  0,
                ) <= 0
                ? ["prepago"]
                : []
            }
          />

          {metodoPago === "transferencia" && (
            <View
              style={[
                styles.baucherCard,
                {
                  borderColor: baucherFoto ? "#10B981" : "#EF4444",
                  backgroundColor: baucherFoto
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(239,68,68,0.08)",
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.baucherTitulo, { color: textPrimary }]}>
                  Baucher de la transferencia
                </Text>
                <Text style={[styles.baucherHint, { color: textSecondary }]}>
                  {baucherFoto
                    ? "Foto adjunta lista para enviar."
                    : "Obligatorio: adjunta la foto o captura del comprobante."}
                </Text>
              </View>
              {baucherFoto && (
                <Image source={{ uri: baucherFoto }} style={styles.baucherThumb} />
              )}
              <Pressable
                onPress={handleAdjuntarBaucher}
                style={[styles.baucherBtn, { borderColor: accentColor }]}
                accessibilityRole="button"
                accessibilityLabel="Adjuntar baucher de la transferencia"
              >
                <Ionicons
                  name={baucherFoto ? "refresh" : "camera"}
                  size={18}
                  color={accentColor}
                />
                <Text style={[styles.baucherBtnText, { color: accentColor }]}>
                  {baucherFoto ? "Repetir" : "Adjuntar"}
                </Text>
              </Pressable>
              {baucherFoto && (
                <Pressable
                  onPress={() => setBaucherFoto(null)}
                  style={styles.baucherQuitar}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar baucher"
                >
                  <Ionicons name="close" size={16} color={textSecondary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <CartList
          items={cart as any}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
        />
        <ShotMixerSelector
          bottle
          items={cart.map((p) => ({
            ...p,
            nombre: p.nombre || p.name || "",
            cantidad: p.quantity,
          }))}
          onChangeBottle={(index, sabores) =>
            dispatch({
              type: "SET_CART",
              payload: cart.map((p, i) =>
                i === index ? { ...p, acompanamiento_botella: sabores } : p,
              ),
            })
          }
        />
        {cart.some((p) => p.tipo_venta === "shot") && (
          <ShotMixerSelector
            items={cart.map((p) => ({
              ...p,
              nombre: p.nombre || p.name || "",
              cantidad: p.quantity,
            }))}
            onChange={(index, mixer) =>
              dispatch({
                type: "SET_CART",
                payload: cart.map((p, i) =>
                  i === index ? { ...p, acompanamiento_corto: mixer } : p,
                ),
              })
            }
          />
        )}

        <View
          style={[
            styles.summaryCard,
            dynamicStyles.summaryCard,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>
              Subtotal
            </Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>
              ${totals.subtotal.toLocaleString()}
            </Text>
          </View>
          {state.cart.some(
            (item) => item.tipo_venta === "shot" && item.quantity > 1,
          ) && (
              <Pressable
                onPress={() =>
                  dispatch({
                    type: "SET_CART",
                    payload: individualShorts(state.cart),
                  })
                }
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: accentColor, fontWeight: "600" }}>
                  Elegir bebida y anfitriona por cada corto
                </Text>
              </Pressable>
            )}
          <TipCheckbox
            enabled={enableTip}
            onToggle={(val: boolean) =>
              dispatch({ type: "SET_ENABLE_TIP", payload: val })
            }
            tipAmount={totals.tip}
          />
          <View
            style={[
              styles.summaryRow,
              {
                marginTop: 10,
                borderTopWidth: 1,
                borderTopColor: borderColor,
                paddingTop: 10,
              },
            ]}
          >
            <Text style={[styles.totalLabel, { color: textPrimary }]}>
              TOTAL
            </Text>
            <Text style={[styles.totalValue, { color: accentColor }]}>
              ${totals.total.toLocaleString()}
            </Text>
          </View>
          {metodoPago === "tarjeta" &&
            totals.total > 0 &&
            (() => {
              const splitTarjeta = getCardSplit(totals.total);
              return (
                <View
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    backgroundColor: isDark
                      ? "rgba(245,158,11,0.12)"
                      : "#FFFBEB",
                    borderColor: isDark ? "rgba(245,158,11,0.35)" : "#FDE68A",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "900",
                      textTransform: "uppercase",
                      color: isDark ? "#FCD34D" : "#92400E",
                      marginBottom: 4,
                    }}
                  >
                    Tarjetero
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      lineHeight: 18,
                      color: isDark ? "#FDE68A" : "#78350F",
                    }}
                  >
                    Genera venta por ${splitTarjeta.venta.toLocaleString()} (
                    {splitVentaPct}%) y propina por $
                    {splitTarjeta.propina.toLocaleString()} ({splitPropinaPct}
                    %). Solo informativo, no afecta la caja.
                  </Text>
                </View>
              );
            })()}
          <Pressable
            style={[
              styles.submitBtn,
              dynamicStyles.submitBtn,
              { backgroundColor: accentColor },
              (submitting ||
                cajaAbierta === false ||
                cart.length === 0 ||
                !metodoPago ||
                (metodoPago === "transferencia" && !baucherFoto)) && { opacity: 0.7 },
            ]}
            onPress={() => handleSubmit(baucherFoto)}
            disabled={
              submitting ||
              cajaAbierta === false ||
              cart.length === 0 ||
              !metodoPago ||
              (metodoPago === "transferencia" && !baucherFoto)
            }
            accessibilityLabel="Finalizar venta"
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Finalizar Venta</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <NuevaVentaModals
        styles={styles}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        categoryModalVisible={modalOpen}
        modalCategoria={modalCategoria}
        modalProducts={modalProducts}
        modalLoading={modalLoading}
        selectedTime={selectedTime}
        timeModalVisible={false}
        loadModalVisible={loadModalVisible}
        loadingTargetClient={loadingTargetClient}
        loadingAmount={loadingAmount}
        loadMetodoPago={loadMetodoPago}
        loadSubmitting={loadSubmitting}
        onCloseCategoryModal={() =>
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "category",
            visible: false,
          })
        }
        onPressAddProduct={handlePressAddProduct}
        onCloseTimeModal={() =>
          dispatch({ type: "SET_MODAL_VISIBLE", modal: "time", visible: false })
        }
        onSelectTime={(time) =>
          dispatch({ type: "SET_SELECTED_TIME", payload: time })
        }
        onCloseLoadModal={() =>
          dispatch({ type: "SET_LOAD_MODAL", visible: false })
        }
        onLoadAmountChange={(value) =>
          dispatch({ type: "SET_LOAD_AMOUNT", payload: value })
        }
        onLoadMetodoPagoChange={(value) =>
          dispatch({ type: "SET_LOAD_METODO_PAGO", payload: value })
        }
        onConfirmLoad={handleLoadPrepago}
      />
      <RoomSelectModal
        visible={roomModalVisible}
        rooms={habitaciones}
        requireCompleteConfig
        selectedRoomId={
          selectedHabitacion?.id || selectedHabitacion?.id_habitacion
        }
        onClose={() =>
          dispatch({ type: "SET_MODAL_VISIBLE", modal: "room", visible: false })
        }
        onSelect={(room) => {
          dispatch({ type: "SET_SELECTED_HABITACION", payload: room as any });
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "room",
            visible: false,
          });
        }}
      />
      <ClientSelectModal
        visible={clientModalVisible}
        clients={clientSelectionTarget === "secondary"
          ? clientes.filter((cliente) => {
              const id = String(cliente.id_cliente ?? cliente.id);
              const primaryId = String(selectedCliente?.id_cliente ?? selectedCliente?.id ?? "");
              return id !== primaryId &&
                Number(cliente.saldo ?? (cliente as any).saldo_prepago ?? 0) > 0;
            })
          : clientes}
        selectedIds={
          (clientSelectionTarget === "secondary" ? selectedSegundoCliente : selectedCliente)
            ? [(clientSelectionTarget === "secondary" ? selectedSegundoCliente : selectedCliente)!.id_cliente ||
               (clientSelectionTarget === "secondary" ? selectedSegundoCliente : selectedCliente)!.id]
            : []
        }
        max={1}
        onClose={() =>
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "client",
            visible: false,
          })
        }
        onLoadBalance={(client) =>
          dispatch({
            type: "SET_LOAD_MODAL",
            visible: true,
            client: client as any,
          })
        }
        onToggle={(id) => {
          const cl = clientes.find(
            (c) => String(c.id_cliente || c.id) === String(id),
          );
          dispatch({
            type: clientSelectionTarget === "secondary"
              ? "SET_SELECTED_SEGUNDO_CLIENTE"
              : "SET_SELECTED_CLIENTE",
            payload: cl || null,
          });
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "client",
            visible: false,
          });
        }}
      />
      <NuevaVentaHostessModal
        servicioAnfitrionas={servicioAnfitrionas}
        visible={hostessSubModalVisible && hostessSelectionTarget !== null}
        hostesses={anfitrionas}
        selectedIds={
          hostessSelectionTarget
            ? modalHostessSelections[hostessSelectionTarget.productId] || []
            : []
        }
        selectionTarget={hostessSelectionTarget}
        showToast={() => { }}
        onToggleHostess={handleToggleHostess}
        onClose={() => dispatch({ type: "SET_HOSTESS_TARGET", target: null })}
        onConfirmProduct={async (product) => {
          await addProductToCart(product);
          dispatch({ type: "SET_HOSTESS_TARGET", target: null });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 15,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(155,155,155,0.03)",
  },
  selectorText: { fontSize: 14, fontWeight: "700" },
  summaryCard: { padding: 24, borderRadius: 32, borderWidth: 1 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, fontWeight: "600" },
  summaryVal: { fontSize: 15, fontWeight: "800" },
  totalLabel: { fontSize: 18, fontWeight: "900" },
  totalValue: { fontSize: 26, fontWeight: "900" },
  baucherCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  baucherTitulo: { fontSize: 13, fontWeight: "800" },
  baucherHint: { fontSize: 11, fontWeight: "600", marginTop: 2, lineHeight: 15 },
  baucherThumb: { width: 42, height: 42, borderRadius: 10 },
  baucherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  baucherBtnText: { fontSize: 12, fontWeight: "800" },
  baucherQuitar: { padding: 2 },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
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
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
