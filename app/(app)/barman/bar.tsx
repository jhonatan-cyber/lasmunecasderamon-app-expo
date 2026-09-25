import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import FlashList from '@/components/shared/FlashList';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { BarStockList } from '@/components/barman/bar/BarStockList';
import { ContainerReturnPanel } from '@/components/barman/bar/ContainerReturnPanel';
import { EnvaseScannerModal } from '@/components/barman/bar/EnvaseScannerModal';
import { MovementsList } from '@/components/barman/bar/MovementsList';
import { TransferCard } from '@/components/barman/bar/TransferCard';
import { useBarScreen } from '@/hooks/useBarScreen';
import { useEnvasesScreen } from '@/hooks/useEnvasesScreen';
import { useAccentColor } from '@/hooks/useAccentColor';

type TabId = 'stock' | 'pendientes' | 'historial' | 'envases';

export default function BarScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [activeTab, setActiveTab] = useState<TabId>('stock');
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
    limpiarSesion,
  } = useEnvasesScreen();
  const [scannerVisible, setScannerVisible] = useState(false);

  const onTabChange = (tabId: string) => {
    setActiveTab(tabId as TabId);
    if (tabId === 'historial') loadMovements();
    if (tabId === 'pendientes') fetchTransfers();
    if (tabId === 'envases') fetchDevoluciones();
  };

  // El envase se procesa y el campo queda libre para la siguiente lectura.
  const enviarEnvase = async () => {
    if (await enviarEscaneo(codigo)) setCodigo('');
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Bar"
        subtitle={`${totalBar} unidades en barra`}
        rightComponent={
          <Pressable onPress={() => router.replace('/(app)/barman/(tabs)')} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </Pressable>
        }
        tabs={[
          { id: 'stock', label: 'Stock' },
          { id: 'pendientes', label: `Pendientes${transfers.length > 0 ? ` (${transfers.length})` : ''}` },
          { id: 'historial', label: 'Historial' },
          { id: 'envases', label: 'Envases' },
        ]}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {activeTab === 'stock' && (
        <View style={[styles.searchWrap, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="search" size={16} color={textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar producto, presentación..."
            placeholderTextColor={textSecondary}
            style={[styles.searchInput, { color: textPrimary }]}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        {activeTab === 'stock' && (
          <BarStockList
            items={stock}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'pendientes' &&
          (loadingTransfers ? (
            <View style={{ padding: 16, gap: 10 }}>
              {[1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={170} borderRadius={16} />
              ))}
            </View>
          ) : (
            <FlashList
              data={transfers}
              keyExtractor={(item: { id: string }) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={textSecondary} />
                  <Text style={[styles.emptyText, { color: textSecondary }]}>
                    Sin recepciones pendientes
                  </Text>
                </View>
              }
              renderItem={({ item }: { item: (typeof transfers)[number] }) => (
                <TransferCard
                  item={item}
                  resolving={resolvingId === item.id}
                  onAccept={() => resolver(item.id, 'aprobar')}
                  onReject={() => resolver(item.id, 'rechazar')}
                />
              )}
            />
          ))}

        {activeTab === 'historial' && (
          <MovementsList
            items={movements}
            loading={loadingMovements}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'envases' && (
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
        )}
      </View>

      <EnvaseScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={async (codigoEscaneado) => {
          const veredicto = await enviarEscaneo(codigoEscaneado);
          if (veredicto) setCodigo('');
          return veredicto;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', padding: 0 },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
  },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
