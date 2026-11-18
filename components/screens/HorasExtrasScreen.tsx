import { EmployeeListError } from '@/components/shared/EmployeeListError';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { EmptyState } from '@/components/ui/EmptyState';
import { OvertimeCard } from '@/components/ui/OvertimeCard';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { LIST_PERF_PROPS } from '@/constants/listPerf';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useHorasExtras, HoraExtra } from '@/hooks/useHorasExtras';

export default function HorasExtrasScreen() {
  const { accentColor, isDark, bg, cardBg, textSecondary, borderColor } =
    useAccentColor();
  const {
    data: horasExtras,
    loading,
    refreshing,
    error,
    onRefresh,
    fetchData,
  } = useHorasExtras();
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');

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

  const filteredData = horasExtras.filter((a) => {
    if (filter === 'pendiente') return a.estado === 1;
    if (filter === 'pagado') return a.estado === 0;
    return true;
  });

  const pendientes = horasExtras.filter((a) => a.estado === 1);
  const totalPendiente = pendientes.reduce(
    (sum, a) => sum + (a.total || a.monto || 0),
    0,
  );

  const renderItem = useCallback(
    ({ item, index }: { item: HoraExtra; index: number }) => (
      <AnimatedView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
      >
        <OvertimeCard
          item={item}
          index={index}
          showIndexBadge={false}
          usePagadoLabel={true}
          compactDate={false}
          showPaymentDate={true}
        />
      </AnimatedView>
    ),
    [],
  );

  const renderHorasExtrasSkeleton = () => (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Horas Extras"
        subtitle="Mi tiempo adicional laborado"
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
              style={{ flexDirection: 'row', justifyContent: 'space-around' }}
            >
              <Skeleton width={80} height={30} />
              <Skeleton width={80} height={30} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) return renderHorasExtrasSkeleton();

  if (error)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader
          title="Horas Extras"
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
        title="Horas Extras"
        subtitle="Mi tiempo adicional laborado"
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
          HORAS EXTRAS PENDIENTES
        </Text>
        <Text style={[styles.summaryAmount, { color: accentColor }]}>
          ${totalPendiente.toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Pendientes: {pendientes.length}
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
            Total Items: {horasExtras.length}
          </Text>
        </View>
      </View>

      <FilterTabs
        tabs={[
          { key: 'all', label: 'Todas', count: horasExtras.length },
          { key: 'pendiente', label: 'Pendientes', count: pendientes.length },
          { key: 'pagado', label: 'Cobradas', count: horasExtras.length - pendientes.length },
        ]}
        activeKey={filter}
        onTabPress={setFilter}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      {error ? (
        <View
          style={[
            styles.errorCard,
            { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' },
          ]}
        >
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable
            onPress={() => fetchData()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <VirtualizedList
        data={filteredData}
        keyExtractor={(item: HoraExtra) => item.id_hora_extra.toString()}
        renderItem={renderItem}
        estimatedItemSize={120}
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
          <EmptyState icon="time-outline" title="No se encontraron horas extras" />
        }
        {...LIST_PERF_PROPS}
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
  errorCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
