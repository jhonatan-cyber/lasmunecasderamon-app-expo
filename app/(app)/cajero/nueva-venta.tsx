import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { CartList } from '@/components/cajero/forms/CartList';
import { CategorySelector } from '@/components/cajero/forms/CategorySelector';
import { ClientSelectModal } from '@/components/cajero/forms/ClientSelectModal';
import { NuevaVentaHostessModal } from '@/components/cajero/nueva-venta/NuevaVentaHostessModal';
import { PaymentMethodSelect } from '@/components/cajero/forms/PaymentMethodSelect';
import { NuevaVentaModals } from '@/components/cajero/nueva-venta/NuevaVentaModals';
import { TimeSelector } from '@/components/ui/TimeSelector';
import { RoomSelectModal } from '@/components/cajero/forms/RoomSelectModal';
import { TipCheckbox } from '@/components/cajero/forms/TipCheckbox';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useNuevaVenta } from '@/hooks/useNuevaVenta';
import { NuevaVentaSkeleton } from '@/components/cajero/nueva-venta/NuevaVentaSkeleton';
import { MixedPaymentPanel } from '@/components/cajero/nueva-venta/MixedPaymentPanel';

export default function NuevaVentaScreen() {
  const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;


  const {
    state,
    dispatch,
    totals,
    hasCommissionItem,
    onRefresh,
    handleLoadPrepago,
    handleOpenCategory,
    handlePressAddProduct,
    addProductToCart,
    removeFromCart,
    updateQuantity,
    handleSubmit,
    handleToggleHostess,
  } = useNuevaVenta();

  const {
    loadingInitial,
    refreshing,
    anfitrionas,
    habitaciones,
    clientes,
    cajaAbierta,
    cart,
    selectedCliente,
    selectedHabitacion,
    metodoPago,
    pagosMixtos,
    enableTip,
    selectedTime,
    categories,
    modalOpen,
    modalCategoria,
    modalProducts,
    modalLoading,
    modalQuantities,
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

  const spacing = isTablet ? 24 : 16;
  const borderRadius = isTablet ? 28 : 24;
  const dynamicStyles = {
    scrollContent: { padding: spacing, paddingBottom: 100 },
    section: { padding: spacing, borderRadius, marginBottom: spacing },
    summaryCard: { padding: spacing + 8, borderRadius: borderRadius + 4 },
    submitBtn: { height: isTablet ? 70 : 60, borderRadius: isTablet ? 24 : 20 },
    selectorBtn: { padding: isTablet ? 18 : 14, borderRadius: isTablet ? 20 : 16 },
  };

  if (loadingInitial) return <NuevaVentaSkeleton bg={bg} cardBg={cardBg} borderColor={borderColor} spacing={spacing} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <PremiumHeader
        title="Nueva Venta"
        subtitle="Registrar productos y servicios"
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <CategorySelector categories={categories} onSelectCategory={handleOpenCategory} />

        <View style={[styles.section, dynamicStyles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: isTablet ? 16 : 13 }]}>
            2. Detalles de la Venta
          </Text>
          {hasCommissionItem && (
            <Pressable
              style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor }]}
              onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: true })}
              accessibilityLabel="Seleccionar habitación"
              accessibilityRole="button"
            >
              <Ionicons name="business" size={20} color={accentColor} />
              <Text style={[styles.selectorText, { color: textPrimary, marginLeft: 10 }]}>
                {selectedHabitacion?.nombre || 'Seleccionar Habitación'}
              </Text>
            </Pressable>
          )}
          {selectedHabitacion && (
            <View style={{ marginTop: spacing / 2 }}>
              <TimeSelector
                value={selectedTime}
                onChange={(t) => dispatch({ type: 'SET_SELECTED_TIME', payload: t })}
                step={5}
                min={5}
                max={60}
                label="Tiempo (minutos)"
              />
            </View>
          )}
          <Pressable
            style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor, marginTop: hasCommissionItem ? spacing / 2 : 0 }]}
            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: true })}
            accessibilityLabel="Seleccionar cliente"
            accessibilityRole="button"
          >
            <Ionicons name="person" size={20} color={accentColor} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.selectorText, { color: textPrimary }]}>
                {selectedCliente
                  ? ((selectedCliente.nombre || selectedCliente.name || '') + ' ' + (selectedCliente.apellido || selectedCliente.lastName || selectedCliente.last_name || '')).trim() || 'Cliente Seleccionado'
                  : 'Seleccionar Cliente'}
              </Text>
              {selectedCliente && (
                <View>
                  <Text style={{ fontSize: 13, color: accentColor, fontWeight: '700', marginTop: 2 }}>
                    Saldo Prepago: ${Number(selectedCliente.saldo || 0).toLocaleString()}
                  </Text>
                  {(selectedCliente as any).metodo_pago && (
                    <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600', marginTop: 1 }}>
                      Cargado con: {String((selectedCliente as any).metodo_pago).toUpperCase()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Pressable>
          <PaymentMethodSelect
            selectedMethod={metodoPago}
            onSelect={(val) => dispatch({ type: 'SET_METODO_PAGO', payload: val as any })}
            showPrepago={!!selectedCliente}
            showMixto={true}                      disabled={(selectedCliente?.saldo || 0) > 0 && metodoPago !== 'mixto'}
            disabledMethods={selectedCliente && Number(selectedCliente.saldo || 0) <= 0 ? ['prepago'] : []}
          />

          {metodoPago === 'mixto' && (
            <MixedPaymentPanel
              pagosMixtos={pagosMixtos}
              total={totals.total}
              clienteSaldo={selectedCliente ? Number(selectedCliente.saldo || 0) : 0}
              onUpdatePago={(index, monto, display) =>
                dispatch({ type: 'UPDATE_PAGO_MIXTO', index, monto, display })
              }
              onRemovePago={(index) =>
                dispatch({ type: 'REMOVE_PAGO_MIXTO', index })
              }
              onAddPago={(metodo) =>
                dispatch({ type: 'ADD_PAGO_MIXTO', payload: { metodo, monto: 0, display: '' } })
              }
              isDark={isDark}
              accentColor={accentColor}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderColor={borderColor}
            />
          )}
        </View>

        <CartList items={cart as any} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />

        <View style={[styles.summaryCard, dynamicStyles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>${totals.subtotal.toLocaleString()}</Text>
          </View>
          <TipCheckbox
            enabled={enableTip}
            onToggle={(val: boolean) => dispatch({ type: 'SET_ENABLE_TIP', payload: val })}
            tipAmount={totals.tip}
          />
          <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 10 }]}>
            <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
            <Text style={[styles.totalValue, { color: accentColor }]}>${totals.total.toLocaleString()}</Text>
          </View>
          <Pressable
            style={[styles.submitBtn, dynamicStyles.submitBtn, { backgroundColor: accentColor }, (submitting || cajaAbierta === false) && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting || cajaAbierta === false}
            accessibilityLabel="Finalizar venta"
            accessibilityRole="button"
          >
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Finalizar Venta</Text>}
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
        modalQuantities={modalQuantities}
        selectedTime={selectedTime}
        timeModalVisible={false}
        loadModalVisible={loadModalVisible}
        loadingTargetClient={loadingTargetClient}
        loadingAmount={loadingAmount}
        loadMetodoPago={loadMetodoPago}
        loadSubmitting={loadSubmitting}
        onCloseCategoryModal={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false })}
        onPressAddProduct={handlePressAddProduct}
        onUpdateModalQuantity={(productId, quantity) => dispatch({ type: 'SET_MODAL_QUANTITY', productId, quantity })}
        onCloseTimeModal={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: false })}
        onSelectTime={(time) => dispatch({ type: 'SET_SELECTED_TIME', payload: time })}
        onCloseLoadModal={() => dispatch({ type: 'SET_LOAD_MODAL', visible: false })}
        onLoadAmountChange={(value) => dispatch({ type: 'SET_LOAD_AMOUNT', payload: value })}
        onLoadMetodoPagoChange={(value) => dispatch({ type: 'SET_LOAD_METODO_PAGO', payload: value })}
        onConfirmLoad={handleLoadPrepago}
      />
      <RoomSelectModal
        visible={roomModalVisible}
        rooms={habitaciones}
        selectedRoomId={selectedHabitacion?.id || selectedHabitacion?.id_habitacion}
        onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false })}
        onSelect={(room) => {
          dispatch({ type: 'SET_SELECTED_HABITACION', payload: room as any });
          dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false });
        }}
      />
      <ClientSelectModal
        visible={clientModalVisible}
        clients={clientes}
        selectedIds={selectedCliente ? [selectedCliente.id_cliente || selectedCliente.id] : []}
        max={1}
        onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false })}
        onLoadBalance={(client) => dispatch({ type: 'SET_LOAD_MODAL', visible: true, client: client as any })}
        onToggle={(id) => {
          const cl = clientes.find((c) => String(c.id_cliente || c.id) === String(id));
          dispatch({ type: 'SET_SELECTED_CLIENTE', payload: cl || null });
          dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false });
        }}
      />
      <NuevaVentaHostessModal
        visible={hostessSubModalVisible && hostessSelectionTarget !== null}
        hostesses={anfitrionas}
        selectedIds={hostessSelectionTarget ? (modalHostessSelections[hostessSelectionTarget.productId] || []) : []}
        selectionTarget={hostessSelectionTarget}
        showToast={() => {}}
        onToggleHostess={handleToggleHostess}
        onClose={() => dispatch({ type: 'SET_HOSTESS_TARGET', target: null })}
        onConfirmProduct={(product) => {
          addProductToCart(product);
          dispatch({ type: 'SET_HOSTESS_TARGET', target: null });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase', opacity: 0.6 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(155,155,155,0.03)' },
  selectorText: { fontSize: 14, fontWeight: '700' },
  summaryCard: { padding: 24, borderRadius: 32, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, fontWeight: '600' },
  summaryVal: { fontSize: 15, fontWeight: '800' },
  totalLabel: { fontSize: 18, fontWeight: '900' },
  totalValue: { fontSize: 26, fontWeight: '900' },
  submitBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
});
