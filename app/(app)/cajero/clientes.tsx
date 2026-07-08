import { Ionicons } from "@expo/vector-icons";
import FlashList from "@/components/shared/FlashList";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { PremiumFAB } from "@/components/ui/PremiumFAB";
import { Skeleton } from "@/components/ui/Skeleton";
import { useClientes, Client } from "@/hooks/useClientes";
import { ClientCard } from "@/components/cajero/clientes/ClientCard";
import { ClientFormModal } from "@/components/cajero/clientes/ClientFormModal";
import { LoadBalanceModal } from "@/components/cajero/clientes/LoadBalanceModal";
import { ClientHistoryModal } from "@/components/cajero/clientes/ClientHistoryModal";

export default function ClientesScreen() {
  const {
    accentColor,
    isDark,
    textPrimary,
    textSecondary,
    router,
    insets,
    isTablet,
    loading,
    refreshing,
    search,
    setSearch,
    clientModalVisible,
    setClientModalVisible,
    loadModalVisible,
    setLoadModalVisible,
    editingClient,
    loadingAmount,
    setLoadingAmount,
    loadMetodoPago,
    setLoadMetodoPago,
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
  } = useClientes();

  const renderClientCard = ({ item }: { item: Client }) => (
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
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000000" : "#F3F4F6" },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Clientes"
        subtitle="Gestión de prepago y datos"
        rightComponent={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <TouchableOpacity
              onPress={() => fetchClients(true)}
              style={styles.backBtnRight}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtnRight}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.content}>
        <View
          style={[
            styles.searchOuter,
            { backgroundColor: isDark ? "#111111" : "#FFFFFF" },
          ]}
        >
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: isDark ? "#FFFFFF" : "#111827" },
              ]}
              placeholder="Buscar cliente por nombre, RUN o teléfono..."
              placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={isDark ? "#4B5563" : "#9CA3AF"}
                />
              </Pressable>
            )}
          </View>

          <View style={styles.summaryContainer}>
            <View
              style={[styles.summaryPill, { backgroundColor: "#10B98110" }]}
            >
              <Ionicons name="wallet-outline" size={14} color="#10B981" />
              <Text
                style={[
                  styles.summaryLabel,
                  { color: isDark ? "#FFFFFF" : "#111827" },
                ]}
              >
                TOTAL SALDO
              </Text>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                ${Number(totals.totalSaldo || 0).toLocaleString()}
              </Text>
            </View>
            <View
              style={[styles.summaryPill, { backgroundColor: "#EF444410" }]}
            >
              <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text
                style={[
                  styles.summaryLabel,
                  { color: isDark ? "#FFFFFF" : "#111827" },
                ]}
              >
                TOTAL DEUDA
              </Text>
              <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                ${Number(totals.totalDeuda || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

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
          <FlashList
            data={filteredClients}
            renderItem={renderClientCard}
            keyExtractor={(item: Client) => String(item.id)}
            estimatedItemSize={180}
            numColumns={isTablet ? 2 : 1}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchClients(true)}
                tintColor={accentColor}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="people-outline"
                  size={64}
                  color={isDark ? "#1F2937" : "#E5E7EB"}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? "#4B5563" : "#9CA3AF" },
                  ]}
                >
                  {search
                    ? "No se encontraron clientes"
                    : "No hay clientes registrados"}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <PremiumFAB
        label="NUEVO CLIENTE"
        icon="person-add"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
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
    fontWeight: "700",
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
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "900",
    marginLeft: "auto",
  },
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "700",
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
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
