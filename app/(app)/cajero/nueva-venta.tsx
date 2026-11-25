import { useCartDraft } from "@/hooks/useCartDraft";
import { useCartExitGuard } from "@/hooks/useCartExitGuard";
import { formColumn, tabBarBottomPadding } from "@/constants/layout";
import { BorderRadius } from "@/constants/spacing";
import { FontFamily } from "@/constants/fonts";
import { useCallback, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { CartList } from "@/components/cajero/forms/CartList";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { NuevaVentaHostessModal } from "@/components/cajero/nueva-venta/NuevaVentaHostessModal";
import { PaymentMethodSelect } from "@/components/cajero/forms/PaymentMethodSelect";
import { NuevaVentaModals } from "@/components/cajero/nueva-venta/NuevaVentaModals";
import { NuevaVentaSearch } from "@/components/cajero/nueva-venta/NuevaVentaSearch";
import { CajaClosedBanner } from "@/components/cajero/CajaClosedBanner";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { TimeSelector } from "@/components/ui/TimeSelector";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { CollapsibleSection } from "@/components/cajero/nueva-venta/CollapsibleSection";
import { CategoryGrid } from "@/components/cajero/nueva-venta/CategoryGrid";
import { PaymentSummaryCard } from "@/components/cajero/nueva-venta/PaymentSummaryCard";
import { StickyCheckoutBar } from "@/components/cajero/nueva-venta/StickyCheckoutBar";
import { BaucherCard } from "@/components/cajero/nueva-venta/BaucherCard";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useNuevaVenta } from "@/hooks/useNuevaVenta";
import { useConfigValue } from "@/hooks/useConfigValue";
import { NuevaVentaSkeleton } from "@/components/cajero/nueva-venta/NuevaVentaSkeleton";
import { adjuntarBaucher } from "@/utils/baucherPicker";
import {
  bottleMixerUnits,
  requiresShortMixer,
} from "@/hooks/utils/productConfiguration";

export default function NuevaVentaScreen() {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor, accentOnSurface} = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<any>(null);
  const { isTablet } = useResponsiveMetrics();
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

  // La guardia cubre header, gesto y back físico. Mientras se envía la venta
  // no se bloquea la navegación: el propio submit limpia el carrito y navega.
  const { discardPromptVisible, confirmDiscard, cancelDiscard } = useCartExitGuard({
    enabled: cart.length > 0 && !submitting,
    onDiscard: () => {
      clearDraft();
      dispatch({ type: "SET_CART", payload: [] });
    },
  });
  const cartItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Los cards de bebidas solo aparecen cuando alguna línea del carrito realmente
  // lleva acompañamiento (según la presentación elegida). Un producto sin
  // unidades de acompañamiento no debe mostrar el selector de bebidas.
  const needsBottleMixer = cart.some(
    (item) => item.tipo_venta !== "shot" && bottleMixerUnits(item) > 0,
  );
  const needsShortMixer = cart.some((item) => requiresShortMixer(item));

  /** Foto del baucher en data URL; se exige con transferencia al finalizar. */
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [clientSelectionTarget, setClientSelectionTarget] = useState<"primary" | "secondary">("primary");

  // Collapsible card states (all expanded by default)
  const [sections, setSections] = useState({
    categories: true,
    detalles: true,
    carrito: true,
    bebidas: true,
    soda: true,
    pago: true,
  });
  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
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
  const isReadyToSubmit =
    cajaAbierta !== false &&
    cart.length > 0 &&
    !!metodoPago &&
    (metodoPago !== "transferencia" || !!baucherFoto);

  const dynamicStyles = {
    scrollContent: { ...formColumn, padding: spacing, paddingBottom: cart.length > 0 ? (insets.bottom + 120) : 100 },
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
        onBack={() => router.back()}
      />
      <OfflineStatusBanner
        pendientesHref={"/(app)/cajero/pendientes" as never}
      />

      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
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
          cart={cart}
          onAddProduct={handlePressAddProduct}
          onRemoveFromCart={(item, choice) => {
            const productId = String(item.id || item.id_producto);
            const choiceIsShot = choice === "shot" || choice === "shot_anfitriona";
            const choiceAnfitriona = choice === "shot_anfitriona";
            const idx = cart.findIndex((ci) => {
              const ciProductId = String(ci.id || ci.id_producto || ci.producto_id || "");
              if (ciProductId !== productId) return false;
              const ciTipo = ci.tipo_venta || "botella";
              if (choiceIsShot && ciTipo === "shot") {
                return (ci.shot_anfitriona ?? false) === choiceAnfitriona;
              }
              if (!choiceIsShot && ciTipo === "botella") {
                return (ci.botella_anfitriona ?? true) === (choice !== "botella_sin_anfitriona");
              }
              return false;
            });
            if (idx >= 0) {
              removeFromCart(idx);
            }
          }}
          accentColor={accentColor}
          cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />

        {/* 1. Selección de Categoría - Collapsible */}
        <CollapsibleSection
          title="1. Selección de Categoría"
          collapsed={!sections.categories}
          onToggle={() => toggleSection("categories")}
          fontSize={13}
          fontFamily={FontFamily.black}
          accentColor={accentColor}
          accentOnSurface={accentOnSurface}
          textPrimary={textPrimary}
          borderColor={borderColor}
          cardBg={cardBg}
          contentStyle={{ paddingBottom: 14 }}
        >
          <CategoryGrid
            categories={categories}
            onSelect={handleOpenCategory}
            accentColor={accentColor}
            textPrimary={textPrimary}
            borderColor={borderColor}
            cardBg={cardBg}
          />
        </CollapsibleSection>

        {/* 2. Detalles de la Venta - Collapsible */}
        <CollapsibleSection
          title="2. Detalles de la Venta"
          collapsed={!sections.detalles}
          onToggle={() => toggleSection("detalles")}
          fontSize={isTablet ? 16 : 13}
          borderRadius={borderRadius}
          padding={spacing}
          accentColor={accentColor}
          accentOnSurface={accentOnSurface}
          textPrimary={textPrimary}
          borderColor={borderColor}
          cardBg={cardBg}
        >
          {!!servicioId && (
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
              <Ionicons name="business" size={20} color={accentOnSurface} />
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
            <Ionicons name="person" size={20} color={accentOnSurface} />
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
                      color: accentOnSurface,
                      fontFamily: FontFamily.bold,
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
                        fontFamily: FontFamily.semibold,
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
        </CollapsibleSection>

        {/* 3. Carrito - Collapsible */}
        <CollapsibleSection
          title="3. Carrito"
          collapsed={!sections.carrito}
          onToggle={() => toggleSection("carrito")}
          accentColor={accentColor}
          accentOnSurface={accentOnSurface}
          textPrimary={textPrimary}
          borderColor={borderColor}
          cardBg={cardBg}
        >
          <CartList
            items={cart as any}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            title={""}
          />
        </CollapsibleSection>

        {/* Bebidas - Collapsible (solo si la presentación lleva acompañamiento) */}
        {needsBottleMixer && (
          <CollapsibleSection
            title="Bebidas"
            collapsed={!sections.bebidas}
            onToggle={() => toggleSection("bebidas")}
            accentColor={accentColor}
            accentOnSurface={accentOnSurface}
            textPrimary={textPrimary}
            borderColor={borderColor}
            cardBg={cardBg}
          >
            <ShotMixerSelector
              bottle
              compact
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
          </CollapsibleSection>
        )}

        {needsShortMixer && (
          <CollapsibleSection
            title="Bebida para los cortos"
            collapsed={!sections.soda}
            onToggle={() => toggleSection("soda")}
            accentColor={accentColor}
            accentOnSurface={accentOnSurface}
            textPrimary={textPrimary}
            borderColor={borderColor}
            cardBg={cardBg}
          >
            <ShotMixerSelector
              compact
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
          </CollapsibleSection>
        )}

        {/* 4. Método de Pago - Collapsible */}
        <CollapsibleSection
          title="4. Método de Pago"
          collapsed={!sections.pago}
          onToggle={() => toggleSection("pago")}
          fontSize={isTablet ? 16 : 13}
          fontFamily={FontFamily.black}
          borderRadius={borderRadius}
          padding={spacing}
          accentColor={accentColor}
          accentOnSurface={accentOnSurface}
          textPrimary={textPrimary}
          borderColor={borderColor}
          cardBg={cardBg}
          contentStyle={{ paddingBottom: spacing }}
        >
          <PaymentMethodSelect
            showLabel={false}
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
                  accessibilityRole="button"
                  accessibilityLabel={selectedSegundoCliente ? "Repartir prepago con otro cliente" : "Seleccionar segundo cliente para prepago"}
                >
                  <Ionicons
                    name={selectedSegundoCliente ? "people" : "person-add"}
                    size={20}
                    color={accentOnSurface}
                  />
                  <Text style={[styles.selectorText, { color: textPrimary, marginLeft: 10 }]}>
                    {selectedSegundoCliente
                      ? `${selectedSegundoCliente.nombre || selectedSegundoCliente.name || ""} ${selectedSegundoCliente.apellido || selectedSegundoCliente.lastName || ""}`.trim()
                      : "Repartir prepago con otro cliente"}
                  </Text>
                </Pressable>
              </View>
            )}
        </CollapsibleSection>

        {metodoPago === "transferencia" && (
          <BaucherCard
            baucherFoto={baucherFoto}
            accentColor={accentColor}
            onAttach={handleAdjuntarBaucher}
            onRemove={() => setBaucherFoto(null)}
          />
        )}

        <PaymentSummaryCard
          cart={cart}
          totals={totals}
          enableTip={enableTip}
          metodoPago={metodoPago}
          cajaAbierta={cajaAbierta}
          baucherFoto={baucherFoto}
          splitVentaPct={splitVentaPct}
          splitPropinaPct={splitPropinaPct}
          cardBg={cardBg}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          accentColor={accentColor}
          spacing={spacing}
          borderRadius={borderRadius}
          onToggleTip={(val: boolean) =>
            dispatch({ type: "SET_ENABLE_TIP", payload: val })
          }
          onDispatchCart={dispatch}
        />
      </ScrollView>

      {cart.length > 0 && (
        <StickyCheckoutBar
          cart={cart}
          totals={totals}
          submitting={submitting}
          cajaAbierta={cajaAbierta}
          isReadyToSubmit={isReadyToSubmit}
          missingReason={
            cajaAbierta === false
              ? "cash"
              : !metodoPago
                ? "payment"
                : metodoPago === "transferencia" && !baucherFoto
                  ? "receipt"
                  : null
          }
          cardBg={cardBg}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          accentColor={accentColor}
          bottomInset={insets.bottom}
          scrollRef={scrollRef}
          onSubmit={() => handleSubmit(baucherFoto)}
        />
      )}

      <PremiumAlert
        visible={discardPromptVisible}
        title="Descartar venta"
        message={
          cartItemCount === 1
            ? "Vas a salir y se perderá 1 ítem cargado."
            : `Vas a salir y se perderán ${cartItemCount} ítems cargados.`
        }
        type="warning"
        showCancel
        confirmText="Descartar"
        cancelText="Seguir editando"
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />

      {/* El modal de tiempo de NuevaVentaModals se pasa en false a propósito:
          el tiempo se edita con el TimeSelector de la sección "Detalles". */}
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
        cart={cart}
        cartItemCount={cart.length}
        onCloseCategoryModal={() =>
          dispatch({
            type: "SET_MODAL_VISIBLE",
            modal: "category",
            visible: false,
          })
        }
        onPressAddProduct={handlePressAddProduct}
        onRemoveFromCart={(item, choice) => {
          const productId = String(item.id || item.id_producto);
          const choiceIsShot = choice === "shot" || choice === "shot_anfitriona";
          const choiceAnfitriona = choice === "shot_anfitriona";
          const idx = cart.findIndex((ci) => {
            const ciProductId = String(ci.id || ci.id_producto || ci.producto_id || "");
            if (ciProductId !== productId) return false;
            const ciTipo = ci.tipo_venta || "botella";
            if (choiceIsShot && ciTipo === "shot") {
              return (ci.shot_anfitriona ?? false) === choiceAnfitriona;
            }
            if (!choiceIsShot && ciTipo === "botella") {
              return (ci.botella_anfitriona ?? true) === (choice !== "botella_sin_anfitriona");
            }
            return false;
          });
          if (idx >= 0) {
            removeFromCart(idx);
          }
        }}
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
  scrollContent: { ...formColumn, padding: 16, paddingBottom: tabBarBottomPadding },
  section: { padding: 16, borderRadius: BorderRadius.card, borderWidth: 1, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FontFamily.black,
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
  selectorText: { fontSize: 14, fontFamily: FontFamily.bold },
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
