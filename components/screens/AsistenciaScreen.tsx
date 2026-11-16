import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { EmptyState } from '@/components/ui/EmptyState';
import { LIST_PERF_PROPS } from '@/constants/listPerf';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAsistencia } from '@/hooks/useAsistencia';
import { useStableCallback } from '@/hooks/useStableCallback';
import { DateRangeFilterModal } from '@/components/screens/asistencia/DateRangeFilterModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';


export default function AsistenciaScreen() {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
  } = useAccentColor();
  const {
    isHostess,
    housingDiscountTotal,
    activeTab,
    setActiveTab,
    asistencias,
    gratificaciones,
    loading,
    refreshing,
    error,
    filter,
    setFilter,
    onRefresh,
  } = useAsistencia();

  // Date range filter state
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [dateFilterVisible, setDateFilterVisible] = useState(false);

  const handleDateFilterApply = useCallback((from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const normalizeEstado = (estado: number | string | null | undefined) => {
    if (
      estado === 1 ||
      estado === '1' ||
      estado === 'pendiente' ||
      estado === 'por_cobrar' ||
      estado === 'por cobrar'
    ) {
      return 'pendiente';
    }
    if (
      estado === 0 ||
      estado === '0' ||
      estado === 'pagado' ||
      estado === 'cobrado' ||
      estado === 'cobrada'
    ) {
      return 'pagado';
    }
    return String(estado ?? '');
  };

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      const day = date.getUTCDate();
      const month = date.toLocaleDateString('es-ES', {
        month: 'short',
        timeZone: 'UTC',
      });
      const year = date.getUTCFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return 'Error';
    }
  }, []);

  const currentData =
    activeTab === 'asistencias' ? asistencias : gratificaciones;

  const filterByDate = useCallback((a: any): boolean => {
    if (!dateFrom && !dateTo) return true;
    const raw = a.fecha;
    if (!raw) return false;
    let key = raw;
    if (raw.includes('T')) key = raw.split('T')[0];
    else if (raw.length > 10) key = raw.substring(0, 10);
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  }, [dateFrom, dateTo]);

  const filteredData =
    activeTab === 'asistencias'
      ? currentData.filter((a: any) => {
          const estado = normalizeEstado(a.estado);
          if (filter === 'pendiente') return estado === 'pendiente';
          if (filter === 'pagado') return estado === 'pagado';
          if (!filterByDate(a)) return false;
          return true;
        })
      : currentData;

  const pendientes = currentData.filter(
    (a: any) => normalizeEstado(a.estado) === 'pendiente',
  );
  const pagados = currentData.filter(
    (a: any) => normalizeEstado(a.estado) === 'pagado',
  );
  const totalSueldo =
    activeTab === 'asistencias'
      ? pendientes.reduce((sum, a: any) => sum + (a.sueldo || 0), 0)
      : pendientes.reduce((sum, g: any) => sum + (g.monto || 0), 0);
  const totalAporte =
    activeTab === 'asistencias'
      ? pendientes.reduce((sum, a: any) => sum + (a.aporte || 0), 0)
      : 0;
  const totalACobrar = Math.max(
    0,
    totalSueldo -
      totalAporte -
      (activeTab === 'asistencias' ? housingDiscountTotal : 0),
  );

  const renderItem = useStableCallback(
    ({ item, index }: { item: any; index: number }) => {
      const estado = normalizeEstado(item.estado);
      const isPendiente = estado === 'pendiente';
      const isPagado = estado === 'pagado';
      const isAsistencia = activeTab === 'asistencias';
      const dateStr = isAsistencia ? item.fecha : item.fecha_hora;
      const timeStr = isAsistencia
        ? item.hora
        : !isAsistencia && item.fecha_hora
          ? item.fecha_hora.split(' ')[1]
          : '';

      return (
        <AnimatedView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.indexBadge,
                  { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                ]}
              >
                <Text style={[styles.indexText, { color: textPrimary }]}>
                  {index + 1}
                </Text>
              </View>
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
                  {isPendiente
                    ? 'Por cobrar'
                    : isPagado
                      ? 'Cobrado'
                      : 'Sin estado'}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              {!isAsistencia && item.descripcion ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: textSecondary,
                    marginBottom: 12,
                    backgroundColor: isDark ? '#222' : '#f9f9f9',
                    padding: 8,
                    borderRadius: 8,
                    fontStyle: 'italic',
                  }}
                >
                  “{item.descripcion}”
                </Text>
              ) : null}
              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={textSecondary}
                />
                <Text style={[styles.dateText, { color: textPrimary }]}>
                  {formatDate(dateStr)}
                </Text>
                {timeStr ? (
                  <>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={textSecondary}
                      style={{ marginLeft: 12 }}
                    />
                    <Text style={[styles.dateText, { color: textSecondary }]}>
                      {timeStr?.slice(0, 5)}
                    </Text>
                  </>
                ) : null}
              </View>

              {isAsistencia ? (
                <View style={styles.amountsRow}>
                  <View style={styles.amountItem}>
                    <Text
                      style={[styles.amountLabel, { color: textSecondary }]}
                    >
                      Sueldo
                    </Text>
                    <Text style={[styles.amountValue, { color: textPrimary }]}>
                      ${(item.sueldo || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text
                      style={[styles.amountLabel, { color: textSecondary }]}
                    >
                      Aporte
                    </Text>
                    <Text style={[styles.amountValue, { color: '#EF4444' }]}>
                      -${(item.aporte || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text
                      style={[styles.amountLabel, { color: textSecondary }]}
                    >
                      Total
                    </Text>
                    <Text
                      style={[
                        styles.amountValue,
                        { color: accentColor, fontWeight: '800' },
                      ]}
                    >
                      ${(item.total || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.amountsRow}>
                  <View style={styles.amountItem}>
                    <Text
                      style={[styles.amountLabel, { color: textSecondary }]}
                    >
                      Monto Otorgado
                    </Text>
                    <Text
                      style={[
                        styles.amountValue,
                        { color: accentColor, fontWeight: '800' },
                      ]}
                    >
                      ${(item.monto || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {item.fecha_pago && isPagado ? (
                <View style={styles.paymentRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={accentColor}
                  />
                  <Text style={[styles.paymentText, { color: textSecondary }]}>
                    Pagado: {formatDate(item.fecha_pago)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </AnimatedView>
      );
    },
  );

  if (loading)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title="Asistencia" />
        <View style={{ margin: 16 }}>
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2].map((i) => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={100}
              borderRadius={16}
            />
          ))}
        </View>
      </View>
    );

  if (error)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title="Asistencia" />
        <EmployeeListError message={error} onRetry={onRefresh} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Asistencia"
        subtitle="Registro de turnos y bonificaciones"
      />
      <View
        style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 16 }}
      >
        <Pressable
          style={[
            styles.mainTab,
            activeTab === 'asistencias' && {
              backgroundColor: accentColor,
              borderColor: accentColor,
            },
            {
              backgroundColor:
                activeTab !== 'asistencias' ? cardBg : accentColor,
            },
          ]}
          onPress={() => setActiveTab('asistencias')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === 'asistencias' ? '#FFFFFF' : textSecondary}
          />
          <Text
            style={[
              styles.mainTabText,
              {
                color: activeTab === 'asistencias' ? '#FFFFFF' : textSecondary,
              },
            ]}
          >
            Turnos
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.mainTab,
            activeTab === 'gratificaciones' && {
              backgroundColor: accentColor,
              borderColor: accentColor,
            },
            {
              backgroundColor:
                activeTab !== 'gratificaciones' ? cardBg : accentColor,
            },
          ]}
          onPress={() => setActiveTab('gratificaciones')}
        >
          <Ionicons
            name="gift-outline"
            size={18}
            color={activeTab === 'gratificaciones' ? '#FFFFFF' : textSecondary}
          />
          <Text
            style={[
              styles.mainTabText,
              {
                color:
                  activeTab === 'gratificaciones' ? '#FFFFFF' : textSecondary,
              },
            ]}
          >
            Gratificaciones
          </Text>
        </Pressable>
      </View>


      <View
        style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}
      >
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          {activeTab === 'asistencias'
            ? 'SITUACIÓN DE ASISTENCIAS'
            : 'GRATIFICACIONES ENTREGADAS'}
        </Text>
        <Text
          style={[
            styles.summaryAmount,
            { color: activeTab === 'asistencias' ? '#F59E0B' : accentColor },
          ]}
        >
          $
          {activeTab === 'asistencias'
            ? totalACobrar.toLocaleString()
            : currentData
                .reduce(
                  (sum: number, item: any) => sum + Number(item.monto || 0),
                  0,
                )
                .toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          {activeTab === 'asistencias' ? (
            <>
              <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                Sueldo: ${totalSueldo.toLocaleString()}
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
                Aporte: -${totalAporte.toLocaleString()}
              </Text>
              {isHostess && (
                <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                  Alojamiento: -${housingDiscountTotal.toLocaleString()}
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.summaryDetail, { color: textSecondary }]}>
              Total histórico: $
              {currentData
                .reduce(
                  (sum: number, item: any) => sum + Number(item.monto || 0),
                  0,
                )
                .toLocaleString()}
            </Text>
          )}
        </View>
      </View>

      {activeTab === 'asistencias' && (
        <FilterTabs
          tabs={[
            { key: 'all', label: 'Todas', count: currentData.length },
            { key: 'pendiente', label: 'Pendientes', count: pendientes.length },
            { key: 'pagado', label: 'Pagadas', count: pagados.length },
          ]}
          activeKey={filter}
          onTabPress={setFilter}
          accentColor={accentColor}
          cardBg={cardBg}
          textSecondary={textSecondary}
          borderColor={borderColor}
          leadingChildren={
            <Pressable
              style={[
                styles.dateFilterButton,
                {
                  borderColor: (dateFrom || dateTo) ? accentColor : borderColor,
                  backgroundColor: (dateFrom || dateTo)
                    ? isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF'
                    : cardBg,
                },
              ]}
              onPress={() => setDateFilterVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Filtrar por fechas"
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={(dateFrom || dateTo) ? accentColor : textSecondary}
              />
              <Text
                style={[
                  styles.dateFilterText,
                  {
                    color: (dateFrom || dateTo) ? accentColor : textSecondary,
                  },
                ]}
              >
                Fechas
              </Text>
            </Pressable>
          }
        />
      )}

      <VirtualizedList
        data={filteredData}
        keyExtractor={(item: any) => (item.id_asistencia || item.id).toString()}
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
          <EmptyState icon="clipboard-outline" title="No se encontraron registros" />
        }
        {...LIST_PERF_PROPS}
      />

      {/* Date range filter modal */}
      <DateRangeFilterModal
        visible={dateFilterVisible}
        onClose={() => setDateFilterVisible(false)}
        onApply={handleDateFilterApply}
        asistencias={asistencias}
        accentColor={accentColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        cardBg={cardBg}
        borderColor={borderColor}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    marginHorizontal: 4,
  },
  mainTabText: { fontSize: 13, fontWeight: '700' },
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
  summaryAmount: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  summaryDetail: { fontSize: 13, fontWeight: '600' },
  dateFilterButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
  },
  dateFilterText: { fontSize: 10, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
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
  cardBody: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: { fontSize: 14 },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountItem: { alignItems: 'center' },
  amountLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  amountValue: { fontSize: 16, fontWeight: '700' },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  paymentText: { fontSize: 12 },
});
