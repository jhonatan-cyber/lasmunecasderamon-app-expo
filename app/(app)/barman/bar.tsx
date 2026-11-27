import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { ErrorState } from '@/components/ui/ErrorState';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { BarmanOfflineBanner } from '@/components/barman/BarmanOfflineBanner';
import { BarStockList } from '@/components/barman/bar/BarStockList';
import { ContainerReturnPanel } from '@/components/barman/bar/ContainerReturnPanel';
import { EnvaseScannerModal } from '@/components/barman/bar/EnvaseScannerModal';
import { MovementsList } from '@/components/barman/bar/MovementsList';
import { TransferCard } from '@/components/barman/bar/TransferCard';
import { TransferDetailModal } from '@/components/barman/bar/TransferDetailModal';
import { MovementDetailModal } from '@/components/barman/bar/MovementDetailModal';
import { useBarScreen } from '@/hooks/useBarScreen';
import type { BarMovement, BarTransfer } from '@/hooks/useBarScreen';
import { useEnvasesScreen } from '@/hooks/useEnvasesScreen';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { BloqueoPorCaja } from '@/components/shared/BloqueoPorCaja';
import { FontFamily } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabId = 'stock' | 'pendientes' | 'historial' | 'envases';

export default function BarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } =
    useAccentColor();
  const { bloqueado } = useCajaAbierta();
  const [activeTab, setActiveTab] = useState<TabId>(
    params.tab === 'pendientes' ? 'pendientes' : 'stock',
  );
  const [selectedTransfer, setSelectedTransfer] = useState<BarTransfer | null>(
    null,
  );
  const [selectedMovement, setSelectedMovement] = useState<BarMovement | null>(
    null,
  );
  const {
    stock,
    transfers,
    movements,
    loading,
    refreshing,
    loadingTransfers,
    loadingMovements,
    resolvingId,
    search,
    setSearch,
    error,
    totalBar,
    onRefresh,
    resolver,
    loadMovements,
    fetchTransfers,
    transferHistory,
    fetchTransferHistory,
  } = useBarScreen();

  const {
    devoluciones,
    loading: loadingEnvases,
    refreshing: refreshingEnvases,
    error: errorEnvases,
    codigo,
    setCodigo,
    verificando,
    resultado,
    sesion,
    entregados,
    rechazados,
    fetchDevoluciones,
    onRefresh: onRefreshEnvases,
    enviarEscaneo,
    enviarLoteEscaneos,
    limpiarSesion,
  } = useEnvasesScreen();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const onTabChange = (tabId: string) => {
    setSelectedCategory(null);
    setActiveTab(tabId as TabId);
    if (tabId === 'historial') loadMovements();
    if (tabId === 'historial') fetchTransferHistory();
    if (tabId === 'pendientes') fetchTransfers();
    if (tabId === 'envases') fetchDevoluciones();
  };

  const enviarEnvase = async () => {
    if (await enviarEscaneo(codigo)) setCodigo('');
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Bar"
        subtitle={`${totalBar} unidades en barra`}
        onBack={() => {
          if (selectedCategory !== null) {
            setSelectedCategory(null);
          } else {
            router.replace('/(app)/barman/(tabs)');
          }
        }}
      />
      <Tabs
        tabs={[
          { key: 'stock', label: 'Stock' },
          { key: 'pendientes', label: 'Pendientes', count: transfers.length, bloqueado: bloqueado },
          { key: 'historial', label: 'Historial' },
          { key: 'envases', label: 'Envases', bloqueado: bloqueado },
        ]}
        activeKey={activeTab}
        onChange={onTabChange}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
        variant="pills"
      />

      <BarmanOfflineBanner />

      {activeTab === 'stock' && (
        <View
          style={[styles.searchWrap, { backgroundColor: cardBg, borderColor }]}
        >
          <Ionicons name="search" size={16} color={textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar producto, categoría, presentación..."
            placeholderTextColor={textSecondary}
            style={[styles.searchInput, { color: textPrimary }]}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={16} color={textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      {error ? (
        <ErrorState
          variant="inline"
          icon="warning-outline"
          title="Error de conexión"
          message={error}
          onRetry={onRefresh}
        />
      ) : null}

      <View style={{ flex: 1 }}>
        {activeTab === 'stock' && (
          <BarStockList
            items={stock}
            search={search}
            error={error}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
          />
        )}

        {activeTab === 'pendientes' && (
          <BloqueoPorCaja
            bloqueado={bloqueado}
            mensaje="Necesitás una caja abierta para gestionar recepciones pendientes."
          >
            {loadingTransfers ? (
              <View style={{ padding: 16, gap: 10 }}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} width="100%" height={170} borderRadius={16} />
                ))}
              </View>
            ) : (
              <VirtualizedList
                data={transfers}
                keyExtractor={(item: { id: string }) => item.id}
                contentContainerStyle={[
                  styles.list,
                  { paddingBottom: 24 + insets.bottom },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={accentColor}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={48}
                      color={textSecondary}
                    />
                    <Text style={[styles.emptyText, { color: textSecondary }]}>
                      Sin recepciones pendientes
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: (typeof transfers)[number] }) => (
                  <TransferCard
                    item={item}
                    onPress={() => setSelectedTransfer(item)}
                  />
                )}
              />
            )}
          </BloqueoPorCaja>
        )}

        {activeTab === 'historial' && (
          <MovementsList
            items={movements}
            loading={loadingMovements}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onPressItem={setSelectedMovement}
          />
        )}

        {activeTab === 'envases' && (
          <BloqueoPorCaja
            bloqueado={bloqueado}
            mensaje="Necesitás una caja abierta para gestionar devoluciones de envases."
          >
            <ContainerReturnPanel
              codigo={codigo}
              setCodigo={setCodigo}
              verificando={verificando}
              resultado={resultado}
              sesion={sesion}
              entregados={entregados}
              rechazados={rechazados}
              devoluciones={devoluciones}
              loading={loadingEnvases}
              refreshing={refreshingEnvases}
              error={errorEnvases}
              onEnviar={enviarEnvase}
              onLimpiarSesion={limpiarSesion}
              onRefresh={onRefreshEnvases}
              onAbrirScanner={() => setScannerVisible(true)}
            />
          </BloqueoPorCaja>
        )}
      </View>

      <EnvaseScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onSubmitBatch={async (codigosEscaneados) => {
          const resultadosLote = await enviarLoteEscaneos(codigosEscaneados);
          if (resultadosLote) setCodigo('');
          return resultadosLote;
        }}
      />

      <TransferDetailModal
        visible={selectedTransfer !== null}
        item={selectedTransfer}
        resolving={
          selectedTransfer !== null && resolvingId === selectedTransfer.id
        }
        onClose={() => setSelectedTransfer(null)}
        onAccept={async () => {
          if (
            selectedTransfer &&
            (await resolver(selectedTransfer.id, 'aprobar'))
          ) {
            setSelectedTransfer(null);
          }
        }}
        onReject={async () => {
          if (
            selectedTransfer &&
            (await resolver(selectedTransfer.id, 'rechazar'))
          ) {
            setSelectedTransfer(null);
          }
        }}
      />
      <MovementDetailModal
        visible={selectedMovement !== null}
        movement={selectedMovement}
        transfer={transferHistory.find(
          (transfer) => transfer.id === selectedMovement?.id,
        )}
        onClose={() => setSelectedMovement(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16 },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FontFamily.semibold, padding: 0 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: FontFamily.semibold },
});
