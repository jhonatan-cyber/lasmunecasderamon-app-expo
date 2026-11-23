import Ionicons from '@expo/vector-icons/Ionicons';
import VirtualizedList from "@/components/shared/VirtualizedList";
import { contentColumn, tabBarBottomPadding } from "@/constants/layout";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { PremiumFAB } from "@/components/ui/PremiumFAB";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FontSize } from "@/constants/spacing";
import { FontFamily, TabularNumbers } from "@/constants/fonts";
import { useClientes, Client } from "@/hooks/useClientes";
import { ClientCard } from "@/components/cajero/clientes/ClientCard";
import { ClientFormModal } from "@/components/cajero/clientes/ClientFormModal";
import { LoadBalanceModal } from "@/components/cajero/clientes/LoadBalanceModal";
import { ClientHistoryModal } from "@/components/cajero/clientes/ClientHistoryModal";
import { PremiumAlert } from "@/components/ui/PremiumAlert";

const clientKey = (item: Client) => String(item.id);
const formatSummaryMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;

export default function ClientesScreen() {
  const {
    accentColor,
    isDark,
    textPrimary,
    textSecondary,
    bg,
    accentOnSurface,
    accentBg,
    accentText,
    router,
    insets,
    isTablet,
    loading,
    refreshing,
    search,
    setSearch,
    cajaAbierta,
    clientModalVisible,
    setClientModalVisible,
    loadModalVisible,
    setLoadModalVisible,
    editingClient,
    loadingAmount,
    setLoadingAmount,
    loadMetodoPago,
    setLoadMetodoPago,
    loadBaucherFoto,
    setLoadBaucherFoto,
    submitting,
    historyModalVisible,
    setHistoryModalVisible,
    historyLoading,
    historyData,
    refreshingHistory,
    setRefreshingHistory,
    primaryMethod,
    setPrimaryMethod,
    secondaryMethod,
    setSecondaryMethod,
    primaryAmount,
    setPrimaryAmount,
    secondaryAmount,
    setSecondaryAmount,
    formName,
    setFormName,
    formLastName,
    setFormLastName,
    formRun,
    setFormRun,
    formPhone,
    setFormPhone,
    fetchClients,
    filteredClients,
    totals,
    handleOpenEdit,
    handleOpenNew,
    handleSaveClient,
    handleOpenLoad,
    fetchHistory,
    handleOpenHistory,
    formatCurrency,
    unformatCurrency,
    handleLoadBalance,
    confirmDelete,
    deleteConfirm,
    setDeleteConfirm,
    handleDelete,
  } = useClientes();

  const renderClientCard = React.useCallback(({ item }: { item: Client }) => (
    <ClientCard
      item={item}
      isDark={isDark}
      isTablet={isTablet}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      handleOpenHistory={handleOpenHistory}
      handleOpenLoad={handleOpenLoad}
      handleOpenEdit={handleOpenEdit}
      confirmDelete={confirmDelete}
    />
  ), [confirmDelete, handleOpenEdit, handleOpenHistory, handleOpenLoad, isDark, isTablet, textPrimary, textSecondary]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Clientes"
        subtitle="Gestión de prepago y datos"
        onBack={() => router.back()}
      />

      {/* Sticky header: buscador y total saldo */}
      <View style={styles.searchOuter}>
        <SearchBar
          placeholder="Buscar cliente por nombre, RUN o teléfono..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
          debounceMs={0}
        />

        <View style={[styles.summaryContainer, { justifyContent: 'center' }]}>
          <View
            style={[styles.summaryPill, { backgroundColor: accentBg }]}
          >
            <Ionicons name="wallet-outline" size={FontSize.xs} color={accentOnSurface} />
            <Text
              style={[
                styles.summaryLabel,
                { color: accentText },
              ]}
            >
              TOTAL SALDO
            </Text>
            <AnimatedNumber
              style={[styles.summaryValue, { color: accentOnSurface }]}
              value={Number(totals.totalSaldo || 0)}
              format={formatSummaryMoney}
            />
          </View>
        </View>
      </View>

      {/* Lista scrolleable de clientes */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={{ padding: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                width="100%"
                height={120}
                borderRadius={24}
                style={{ marginBottom: 16 }}
              />
            ))}
          </View>
        ) : (
          <VirtualizedList
            data={filteredClients}
            renderItem={renderClientCard}
            keyExtractor={clientKey}
            numColumns={isTablet ? 2 : 1}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchClients(true)}
                tintColor={accentColor}
              />
            }
            windowSize={10}
            maxToRenderPerBatch={7}
            initialNumToRender={5}
            removeClippedSubviews={true}
            ListEmptyComponent={() => (
              <EmptyState
                icon="people-outline"
                title={search ? "No se encontraron clientes" : "No hay clientes registrados"}
                actionLabel={!search ? "Nuevo Cliente" : undefined}
                onAction={!search ? handleOpenNew : undefined}
              />
            )}
          />
        )}
      </View>

      <PremiumFAB
        icon="person-add"
        accessibilityLabel="Nuevo cliente"
        onPress={handleOpenNew}
        visible={
          !clientModalVisible && !loadModalVisible && !historyModalVisible
        }
      />

      {/* Form Modal */}
      <ClientFormModal
        visible={clientModalVisible}
        editingClient={editingClient}
        isDark={isDark}
        insets={insets}
        formName={formName}
        setFormName={setFormName}
        formLastName={formLastName}
        setFormLastName={setFormLastName}
        formRun={formRun}
        setFormRun={setFormRun}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        accentColor={accentColor}
        submitting={submitting}
        handleSaveClient={handleSaveClient}
        onClose={() => setClientModalVisible(false)}
      />

      {/* Load Modal */}
      <LoadBalanceModal
        visible={loadModalVisible}
        editingClient={editingClient}
        isDark={isDark}
        insets={insets}
        loadingAmount={loadingAmount}
        setLoadingAmount={setLoadingAmount}
        loadMetodoPago={loadMetodoPago}
        setLoadMetodoPago={setLoadMetodoPago}
        accentColor={accentColor}
        submitting={submitting}
        cajaAbierta={cajaAbierta}
        primaryMethod={primaryMethod}
        setPrimaryMethod={setPrimaryMethod}
        secondaryMethod={secondaryMethod}
        setSecondaryMethod={setSecondaryMethod}
        primaryAmount={primaryAmount}
        setPrimaryAmount={setPrimaryAmount}
        secondaryAmount={secondaryAmount}
        setSecondaryAmount={setSecondaryAmount}
        formatCurrency={formatCurrency}
        unformatCurrency={unformatCurrency}
        handleLoadBalance={handleLoadBalance}
        loadBaucherFoto={loadBaucherFoto}
        onBaucherFotoChange={setLoadBaucherFoto}
        onClose={() => setLoadModalVisible(false)}
      />

      {/* History Modal */}
      <ClientHistoryModal
        visible={historyModalVisible}
        editingClient={editingClient}
        isDark={isDark}
        insets={insets}
        historyLoading={historyLoading}
        historyData={historyData}
        refreshingHistory={refreshingHistory}
        accentColor={accentColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        fetchHistory={fetchHistory}
        setRefreshingHistory={setRefreshingHistory}
        onClose={() => setHistoryModalVisible(false)}
      />

      {/* Delete Confirmation Alert */}
      <PremiumAlert
        visible={deleteConfirm !== null}
        title="Eliminar Cliente"
        message={deleteConfirm ? `¿Está seguro que desea eliminar a ${deleteConfirm.name} ${deleteConfirm.lastName}?` : ''}
        type="danger"
        showCancel
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onDismiss={() => setDeleteConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1 },
  searchOuter: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(155,155,155,0.08)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  summaryPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    marginLeft: "auto",
    ...TabularNumbers,
  },
  listContent: {
    ...contentColumn,
    padding: 10,
    paddingBottom: tabBarBottomPadding,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
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
  },
});
