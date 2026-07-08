import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { TipDetailModal } from '@/components/shared/TipDetailModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { rotateColor } from "@/utils/colors";
import { usePropinasScreen, Propina } from '@/hooks/usePropinasScreen';

export default function PropinasScreen() {
  const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const {
    propinas,
    loading,
    refreshing,
    error,
    filter,
    setFilter,
    selectedPropina,
    modalVisible,
    setModalVisible,
    loadingDetail,
    saleDetail,
    parentPropina,
    filteredData,
    pendientes,
    totalPendiente,
    totalGeneral,
    onRefresh,
    handlePropinaPress,
    formatDate,
    formatTime,
    fetchData,
  } = usePropinasScreen();



  const renderItem = ({ item, index }: { item: Propina; index: number }) => {
    const isPendiente = item.estado === 1;

    const idNum = typeof item.id_detalle_propina === 'string'
      ? item.id_detalle_propina.split('-').pop()?.substring(0, 2)
      : item.id_detalle_propina;
    const itemAccent = rotateColor(accentColor, ((Number(idNum) || index) % 10) * 36);

    return (
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 100 }}
      >
        <Pressable onPress={() => handlePropinaPress(item)}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {item.codigo_venta ? (
                  <View style={[styles.ventaBadge, { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' }]}>
                    <Ionicons name="receipt-outline" size={12} color={isDark ? '#93C5FD' : '#1E40AF'} />
                    <Text style={[styles.ventaText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                      Codigo : {item.codigo_venta}
                    </Text>
                  </View>
                ) : null}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isPendiente ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE') }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: isPendiente ? (isDark ? '#10B981' : '#065F46') : (isDark ? '#3B82F6' : '#1E40AF') }
                  ]}>
                    {isPendiente ? 'Por cobrar' : 'Cobrada'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                <Text style={[styles.timeText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: textSecondary }]}>Mi parte</Text>
                <Text style={[styles.amountValue, { color: isPendiente ? itemAccent : accentColor }]}>
                  ${(item.monto || 0).toLocaleString()}
                </Text>
              </View>

              {item.propina_fecha_crea && item.estado === 0 ? (
                <View style={styles.paymentRow}>
                  <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                  <Text style={[styles.paymentText, { color: textSecondary }]}>
                    Pagada: {formatDate(item.propina_fecha_crea)}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700' }}>Ver detalles de venta</Text>
                <Ionicons name="chevron-forward" size={12} color={accentColor} />
              </View>
            </View>
          </View>
        </Pressable>
      </MotiView>
    );
  };

  const renderPropinasSkeleton = () => (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader title="Propinas" subtitle="Mis ganancias por servicio" />
      <View style={{ margin: 16 }}>
        <Skeleton width="100%" height={140} borderRadius={16} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
        <Skeleton width="30%" height={35} borderRadius={20} />
        <Skeleton width="30%" height={35} borderRadius={20} />
        <Skeleton width="30%" height={35} borderRadius={20} />
      </View>
      <View style={{ padding: 16, gap: 10 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor, backgroundColor: cardBg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={80} height={20} borderRadius={10} />
            </View>
            <Skeleton height={15} width="60%" style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={60} height={20} />
              <Skeleton width={100} height={30} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) return renderPropinasSkeleton();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader title="Propinas" subtitle="Mis ganancias por servicio" />

      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor, shadowColor: accentColor }]}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>PROPINAS PENDIENTES</Text>
        <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalPendiente.toLocaleString()}</Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Recibido: ${totalGeneral.toLocaleString()}
          </Text>
          <View style={{ width: 1, height: 12, backgroundColor: borderColor, alignSelf: 'center' }} />
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Items: {pendientes.length}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pendiente', 'pagado'] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === f ? accentColor : cardBg,
                borderColor: filter === f ? accentColor : borderColor
              }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
              {f === 'all' ? `Todas (${propinas.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Cobradas (${propinas.length - pendientes.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable onPress={() => fetchData()} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => item.id_detalle_propina?.toString() ?? index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <Ionicons name="cash-outline" size={48} color={textSecondary} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron propinas</Text>
          </View>
        }
      />

      <TipDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        loading={loadingDetail}
        selectedPropina={selectedPropina}
        parentPropina={parentPropina}
        saleDetail={saleDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15 },
  summaryCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 24,
    padding: 24, alignItems: 'center', borderWidth: 1,
    elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
  },
  summaryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  summaryAmount: { fontSize: 38, fontWeight: '900', marginBottom: 12 },
  summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  summaryDetail: { fontSize: 13, fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
  filterButton: { flex: 1, paddingVertical: 8, borderRadius: 9999, alignItems: 'center', borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  indexBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  indexText: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 12, fontWeight: '600' },
  ventaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  ventaText: { fontSize: 11, fontWeight: '600' },
  cardBody: {},
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dateText: { fontSize: 14 },
  timeText: { fontSize: 13, marginLeft: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 14, fontWeight: '600' },
  amountValue: { fontSize: 20, fontWeight: '800' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  paymentText: { fontSize: 12 },
  errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
  retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
