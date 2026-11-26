import { IncludedServiceProductSelector } from "@/components/shared/IncludedServiceProductSelector";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccentColor } from "@/hooks/useAccentColor";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { useGarzonServiciosScreen } from "@/hooks/useGarzonServiciosScreen";
import { BorderRadius, FontSize, HitSlop } from "@/constants/spacing";
import { tabBarBottomPadding } from "@/constants/layout";
import { FontFamily } from "@/constants/fonts";
import { haptic } from "@/utils/haptics";
import { habitacionesParaServicio } from "@/utils/habitaciones";
import {
  MAX_ANFITRIONAS_CON_COMISION,
  MAX_PERSONAS_SERVICIO,
} from "@/utils/servicioReglas";
import {
  GarzonServicioSummary,
  GarzonServiciosModales,
} from "@/components/garzon/servicios";
import { GarzonOfflineBanner } from "@/components/garzon/GarzonOfflineBanner";
import { PaymentMethodSelect, type PaymentMethod } from "@/components/cajero/forms/PaymentMethodSelect";
import { ScreenSkeleton } from "@/components/ui/ScreenSkeleton";

function ServiciosSkeleton({
  bg,
  gradientColors,
  insets,
}: {
  bg: string;
  gradientColors: string[];
  insets: { top: number };
}) {
  return (
    <ScreenSkeleton
      bg={bg}
      gradientColors={gradientColors}
      insets={insets}
      variant="form"
      cardCount={5}
      bodyPadding={20}
      gap={10}
      headerMinHeight={140}
      headerPaddingHorizontal={20}
    />
  );
}

export default function ServiciosScreen() {
  const {
    accentColor,
    gradientColors,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
    semanticColors,
  } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const primaryColor = accentColor;

  const {
    productoIncluido,
    setProductoIncluido,
    rooms,
    anfitrionas,
    clients,
    loading,
    refreshing,
    submitting,
    selectedRoom,
    setSelectedRoom,
    selectedHostesses,
    selectedClients,
    servicePrice,
    setServicePrice,
    paymentMethod,
    setPaymentMethod,
    baucherFoto,
    takeBaucherPhoto,
    roomModalVisible,
    setRoomModalVisible,
    hostessModalVisible,
    setHostessModalVisible,
    clientModalVisible,
    setClientModalVisible,
    hasComision,
    maxHostesses,
    maxClients,
    activeClientWithBalance,
    hasPrepago,
    totals,
    onRefresh,
    toggleHostess,
    toggleClient,
    handleSubmit,
    formatNumber,
  } = useGarzonServiciosScreen();

  if (loading)
    return (
      <ServiciosSkeleton
        bg={bg}
        gradientColors={gradientColors}
        insets={insets}
      />
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: bg }}
    >
      <PremiumHeader
        title="Servicios"
        subtitle="Registrar nuevo servicio en habitación"
        onBack={() => router.back()}
      />

      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        style={styles.container}
        contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
          />
        }
      >

        <GarzonOfflineBanner />

        <View style={{ padding: 20 }}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            HABITACIÓN
          </Text>
          <Pressable
            onPress={() => {
              haptic.tap();
              setRoomModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar habitación"
            accessibilityHint="Abre la lista de habitaciones disponibles"
            hitSlop={HitSlop.sm}
            style={({ pressed }) => [
              styles.selectField,
              {
                backgroundColor: cardBg,
                borderColor: selectedRoom ? primaryColor : borderColor,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.selectFieldContent}>
              <Ionicons
                name="business-outline"
                size={20}
                color={selectedRoom ? primaryColor : textSecondary}
              />
              <Text
                style={[
                  styles.selectFieldText,
                  { color: selectedRoom ? textPrimary : textSecondary },
                ]}
              >
                {selectedRoom
                  ? `${selectedRoom.nombre} - $${selectedRoom.precio.toLocaleString()}`
                  : "Seleccionar habitación..."}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={textSecondary} />
          </Pressable>

          {hasComision && (
            <IncludedServiceProductSelector
              value={productoIncluido}
              onChange={setProductoIncluido}
            />
          )}
          {hasComision && (
            <View
              style={{
                backgroundColor: primaryColor + "15",
                padding: 12,
                borderRadius: 16,
                marginTop: 15,
                borderWidth: 1,
                borderColor: primaryColor + "40",
              }}
            >
              <Text
                maxFontSizeMultiplier={1.5}
                style={{
                  color: textPrimary,
                  fontFamily: FontFamily.extrabold,
                  fontSize: FontSize.xs,
                  textAlign: "center",
                }}
              >
                ✨ Límite: Máx {MAX_ANFITRIONAS_CON_COMISION} Anfitrionas y{" "}
                {MAX_PERSONAS_SERVICIO} personas en total
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            ANFITRIONAS {hasComision && `(MÁX ${maxHostesses})`}
          </Text>
          <Pressable
            onPress={() => {
              haptic.tap();
              setHostessModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar anfitrionas"
            accessibilityHint="Abre la lista de anfitrionas disponibles"
            hitSlop={HitSlop.sm}
            style={({ pressed }) => [
              styles.selectField,
              {
                backgroundColor: cardBg,
                borderColor:
                  selectedHostesses.length > 0 ? primaryColor : borderColor,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.selectFieldContent}>
              <Ionicons
                name="people-outline"
                size={20}
                color={
                  selectedHostesses.length > 0 ? primaryColor : textSecondary
                }
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.selectFieldText,
                    {
                      color:
                        selectedHostesses.length > 0
                          ? textPrimary
                          : textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedHostesses.length > 0
                    ? selectedHostesses
                        .map((id) => {
                          const anf = anfitrionas.find(
                            (a) => String(a.id_usuario || a.id) === String(id),
                          );
                          return anf?.nick || anf?.nombre || anf?.name || "";
                        })
                        .filter(Boolean)
                        .join(", ")
                    : "Seleccionar anfitrionas..."}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={20} color={textSecondary} />
          </Pressable>

          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            CLIENTES (OPCIONAL {hasComision && `- MÁX ${maxClients}`})
          </Text>
          <Pressable
            onPress={() => {
              haptic.tap();
              setClientModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar clientes"
            accessibilityHint="Abre la lista de clientes"
            hitSlop={HitSlop.sm}
            style={({ pressed }) => [
              styles.selectField,
              {
                backgroundColor: cardBg,
                borderColor:
                  selectedClients.length > 0 ? primaryColor : borderColor,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.selectFieldContent}>
              <Ionicons
                name="person-outline"
                size={20}
                color={
                  selectedClients.length > 0 ? primaryColor : textSecondary
                }
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.selectFieldText,
                    {
                      color:
                        selectedClients.length > 0
                          ? textPrimary
                          : textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedClients.length > 0
                    ? selectedClients
                        .map((id) => {
                          const cli = clients.find(
                            (c) =>
                              String(c.id_cliente) === String(id) ||
                              String(c.id) === String(id),
                          );
                          return `${cli?.nombre || cli?.name || ""} ${cli?.apellido || cli?.lastName || ""}`.trim();
                        })
                        .filter(Boolean)
                        .join(", ")
                    : "Seleccionar clientes..."}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={20} color={textSecondary} />
          </Pressable>

          <View style={styles.formSection}>
            {!hasComision && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textSecondary }]}>
                  PRECIO DE SERVICIO
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: cardBg, borderColor },
                  ]}
                >
                  <Text
                    style={{
                      color: textSecondary,
                      fontSize: FontSize.lg,
                      marginRight: 8,
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={textSecondary}
                    keyboardType="numeric"
                    value={servicePrice}
                    onChangeText={(val) => setServicePrice(formatNumber(val))}
                  />
                </View>
              </View>
            )}

            {!hasPrepago && (
              <PaymentMethodSelect
                methods={['efectivo', 'tarjeta', 'transferencia']}
                variant="compact"
                selectedMethod={paymentMethod as PaymentMethod}
                onSelect={(metodo) => setPaymentMethod(metodo as any)}
                getAccessibilityLabel={(metodo) => `Pagar con ${metodo}`}
              />
            )}

            {paymentMethod === "transferencia" && (
              <Pressable
                onPress={() => {
                  haptic.tap();
                  void takeBaucherPhoto();
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  baucherFoto
                    ? "Repetir foto del baucher"
                    : "Sacar foto del baucher (obligatoria)"
                }
                accessibilityHint="Sube el comprobante de transferencia"
                hitSlop={HitSlop.sm}
                style={({ pressed }) => [
                  styles.baucherRow,
                  {
                    borderColor: baucherFoto ? primaryColor : semanticColors.error,
                    backgroundColor: baucherFoto
                      ? primaryColor + "1A"
                      : semanticColors.errorSurface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {baucherFoto ? (
                  <Image
                    source={{ uri: baucherFoto }}
                    style={styles.baucherThumb}
                  />
                ) : (
                  <Ionicons name="camera-outline" size={20} color={semanticColors.error} />
                )}
                <Text
                  style={[
                    styles.baucherText,
                    { color: baucherFoto ? primaryColor : semanticColors.error },
                  ]}
                >
                  {baucherFoto
                    ? "Baucher adjunto · tocar para repetir"
                    : "Sacar foto del baucher (obligatoria)"}
                </Text>
              </Pressable>
            )}

            {hasPrepago && (
              <View
                style={{
                  backgroundColor: semanticColors.successSurface,
                  padding: 15,
                  borderRadius: BorderRadius.card,
                  borderStyle: "dashed",
                  borderWidth: 1.5,
                  borderColor: semanticColors.success,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="wallet" size={20} color={semanticColors.success} />
                  <View style={{ flex: 1 }}>
                    <Text
                      maxFontSizeMultiplier={1.5}
                      style={{
                        color: textPrimary,
                        fontFamily: FontFamily.black,
                        fontSize: FontSize.sm,
                      }}
                    >
                      PAGO AUTOMÁTICO CON SALDO
                    </Text>
                    <Text
                      maxFontSizeMultiplier={1.5}
                      style={{
                        color: semanticColors.success,
                        fontFamily: FontFamily.extrabold,
                        fontSize: FontSize.xs,
                      }}
                    >
                      Saldo disponible: $
                      {(activeClientWithBalance?.saldo || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {paymentMethod === "tarjeta" && !hasComision && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textSecondary }]}>
                  IVA (INC. REDONDEO)
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: cardBg, borderColor, opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={{
                      color: textSecondary,
                      fontSize: FontSize.lg,
                      marginRight: 8,
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary }]}
                    value={formatNumber(totals.iva.toString())}
                    editable={false}
                  />
                </View>
              </View>
            )}
          </View>

          <GarzonServicioSummary
            totals={totals}
            hasComision={hasComision}
            selectedHostessesCount={selectedHostesses.length}
            paymentMethod={paymentMethod}
            primaryColor={primaryColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />

          <Pressable
            onPress={() => {
              haptic.confirm();
              handleSubmit();
            }}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Solicitar servicio"
            accessibilityHint="Envía la solicitud de servicio"
            accessibilityState={{ busy: submitting, disabled: submitting }}
            hitSlop={HitSlop.md}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: primaryColor },
              (submitting || pressed) && { opacity: 0.8 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>SOLICITAR SERVICIO</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <GarzonServiciosModales
        roomModalVisible={roomModalVisible}
        setRoomModalVisible={setRoomModalVisible}
        rooms={habitacionesParaServicio(rooms)}
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        setServicePrice={setServicePrice}
        hostessModalVisible={hostessModalVisible}
        setHostessModalVisible={setHostessModalVisible}
        anfitrionas={anfitrionas}
        selectedHostesses={selectedHostesses}
        toggleHostess={toggleHostess}
        maxHostesses={maxHostesses}
        clientModalVisible={clientModalVisible}
        setClientModalVisible={setClientModalVisible}
        clients={clients}
        selectedClients={selectedClients}
        toggleClient={toggleClient}
        maxClients={maxClients}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
  },
  backBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextHeader: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  selectField: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectFieldContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  selectFieldText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.black,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  formSection: { gap: 10 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.extrabold, letterSpacing: 0.5 },
  inputWrapper: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  submitBtn: {
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    color: "#FFF",
    fontSize: FontSize.sm,
    fontFamily: FontFamily.black,
    letterSpacing: 1,
  },
  baucherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  baucherText: { fontSize: FontSize.xs, fontFamily: FontFamily.extrabold, flex: 1 },
  baucherThumb: { width: 40, height: 40, borderRadius: 8 },
});
