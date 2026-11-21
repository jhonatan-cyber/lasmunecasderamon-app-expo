import { EmployeeListError } from '@/components/shared/EmployeeListError';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { useStableCallback } from '@/hooks/useStableCallback';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { TipDetailModal } from '@/components/shared/TipDetailModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { rotateColor } from '@/utils/colors';
import { usePropinasScreen, Propina } from '@/hooks/usePropinasScreen';
import { useCallback, useState } from 'react';

export default function PropinasScreen() {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    surfaceMuted,
    textPrimary,
    textSecondary,
    borderColor, accentOnSurface} = useAccentColor();
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
    anuladas,
    totalPendiente,
    totalGeneral,
    onRefresh,
    handlePropinaPress,
    formatDate,
    formatTime,
    fetchData,
  } = usePropinasScreen();

  // Alert state for PremiumHeaderActions
  const [alertConfig, setAlertConfig] = useState<any>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: any = 'info',
      onConfirm?: () => void,
      showCancel = false,
    ) => {
      setAlertConfig({
        visible: true,
        title,
        message,
        type,
        onConfirm,
        showCancel,
      });
    },
    [],
  );

  const renderItem = useStableCallback(
    ({ item, index }: { item: Propina; index: number }) => {
      const isPendiente = item.estado === 1;
      const isAnulada = item.venta_estado === 0 || item.venta_estado === 3;

      const idNum =
        typeof item.id_detalle_propina === 'string'
          ? item.id_detalle_propina.split('-').pop()?.substring(0, 2)
          : item.id_detalle_propina;
      const itemAccent = rotateColor(
        accentColor,
        ((Number(idNum) || index) % 10) * 36,
      );

      return (
        <AnimatedView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
        >
          <Pressable onPress={() => handlePropinaPress(item)}>
            <View
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.indexBadge,
                    { backgroundColor: surfaceMuted },
                  ]}
                >
                  <Text style={[styles.indexText, { color: textPrimary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  {item.codigo_venta ? (
                    <View
                      style={[
                        styles.ventaBadge,
                        { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' },
                      ]}
                    >
                      <Ionicons
                        name="receipt-outline"
                        size={12}
                        color={isDark ? '#93C5FD' : '#1E40AF'}
                      />
                      <Text
                        style={[
                          styles.ventaText,
                          { color: isDark ? '#93C5FD' : '#1E40AF' },
                        ]}
                      >
                        Codigo : {item.codigo_venta}
                      </Text>
                    </View>
                  ) : null}
                  {isAnulada ? (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(239, 68, 68, 0.2)'
                            : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isDark ? '#FCA5A5' : '#DC2626',
                          },
                        ]}
                      >
                        {item.venta_estado === 3
                          ? 'Pdte. Anulación'
                          : 'Anulada'}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isPendiente
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.2)'
                              : '#D1FAE5'
                            : isDark
                              ? 'rgba(59, 130, 246, 0.2)'
                              : '#DBEAFE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isPendiente
                              ? isDark
                                ? '#10B981'
                                : '#065F46'
                              : isDark
                                ? '#3B82F6'
                                : '#1E40AF',
                          },
                        ]}
                      >
                        {isPendiente ? 'Por cobrar' : 'Cobrada'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.dateRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={textSecondary}
                  />
                  <Text style={[styles.dateText, { color: textPrimary }]}>
                    {formatDate(item.fecha_crea)}
                  </Text>
                  <Text style={[styles.timeText, { color: textSecondary }]}>
                    {formatTime(item.fecha_crea)}
                  </Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={[styles.amountLabel, { color: textSecondary }]}>
                    Mi parte
                  </Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: isPendiente ? itemAccent : accentColor },
                    ]}
                  >
                    ${(item.monto || 0).toLocaleString()}
                  </Text>
                </View>

                {item.propina_fecha_crea && item.estado === 0 ? (
                  <View style={styles.paymentRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={accentOnSurface}
                    />
                    <Text
                      style={[styles.paymentText, { color: textSecondary }]}
                    >
                      Pagada: {formatDate(item.propina_fecha_crea)}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={{
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: accentOnSurface,
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    Ver detalles de venta
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={accentOnSurface}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </AnimatedView>
      );
    },
  );

  const renderPropinasSkeleton = () => (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Propinas"
        subtitle="Mis ganancias por servicio"
        rightComponent={
          <PremiumHeaderActions onlyTheme
            showAlert={showAlert}
            profilePath="/barman/perfil"
          />
        }
      />
      <View style={{ margin: 16 }}>
        <Skeleton width="100%" height={140} borderRadius={16} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
        <Skeleton width="30%" height={35} borderRadius={20} />
        <Skeleton width="30%" height={35} borderRadius={20} />
        <Skeleton width="30%" height={35} borderRadius={20} />
      </View>
      <View style={{ padding: 16, gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              backgroundColor: cardBg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 15,
              }}
            >
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={80} height={20} borderRadius={10} />
            </View>
            <Skeleton height={15} width="60%" style={{ marginBottom: 15 }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Skeleton width={60} height={20} />
              <Skeleton width={100} height={30} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) return renderPropinasSkeleton();

  if (error)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader
          title="Propinas"
          rightComponent={
            <PremiumHeaderActions onlyTheme
              showAlert={showAlert}
              profilePath="/barman/perfil"
            />
          }
        />
        <EmployeeListError message={error} onRetry={() => fetchData()} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Propinas"
        subtitle="Mis ganancias por servicio"
        rightComponent={
          <PremiumHeaderActions onlyTheme
            showAlert={showAlert}
            profilePath="/barman/perfil"
          />
        }
      />

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: cardBg, borderColor, shadowColor: accentColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          PROPINAS PENDIENTES
        </Text>
        <Text style={[styles.summaryAmount, { color: accentOnSurface }]}>
          ${totalPendiente.toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Recibido: ${totalGeneral.toLocaleString()}
          </Text>
          <View
            style={{
              width: 1,
              height: 12,
              backgroundColor: borderColor,
              alignSelf: 'center',
            }}
          />
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Items: {pendientes.length}
          </Text>
        </View>
      </View>

      <FilterTabs
        tabs={[
          { key: 'all', label: 'Todas', count: propinas.length },
          { key: 'pendiente', label: 'Pendientes', count: pendientes.length },
          { key: 'pagado', label: 'Cobradas', count: propinas.length - pendientes.length },
          { key: 'anulada', label: 'Anuladas', count: anuladas.length },
        ]}
        activeKey={filter}
        onTabPress={setFilter}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      {error ? (
        <ErrorState
          variant="inline"
          icon="warning-outline"
          title="No se pudieron cargar las propinas"
          message={error}
          onRetry={() => fetchData()}
        />
      ) : null}

      <VirtualizedList
        data={filteredData}
        keyExtractor={(item: Propina, index: number) =>
          item.id_detalle_propina?.toString() ?? index.toString()
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="cash-outline" title="No se encontraron propinas" message="No hay propinas registradas para este período. Las propinas aparecerán cuando se asignen." />
        }
        getItemLayout={(_: any, index: number) => ({
          length: 200,
          offset: 200 * index,
          index,
        })}
        windowSize={10}
        maxToRenderPerBatch={7}
        initialNumToRender={5}
        removeClippedSubviews={true}
      />

      <TipDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        loading={loadingDetail}
        selectedPropina={selectedPropina}
        parentPropina={parentPropina}
        saleDetail={saleDetail}
      />

      <PremiumAlert
        {...alertConfig}
        onConfirm={() => {
          alertConfig.onConfirm?.();
          setAlertConfig({ ...alertConfig, visible: false });
        }}
        onCancel={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryAmount: { fontSize: 38, fontWeight: '900', marginBottom: 12 },
  summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  summaryDetail: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: { fontSize: 14, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  ventaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  ventaText: { fontSize: 11, fontWeight: '600' },
  cardBody: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: { fontSize: 14 },
  timeText: { fontSize: 13, marginLeft: 6 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: { fontSize: 14, fontWeight: '600' },
  amountValue: { fontSize: 20, fontWeight: '800' },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  paymentText: { fontSize: 12 },
});
