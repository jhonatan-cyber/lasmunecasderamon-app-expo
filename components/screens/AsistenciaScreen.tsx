import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { BorderRadius } from '@/constants/spacing';
import { EmptyState } from '@/components/ui/EmptyState';
import { LIST_PERF_PROPS } from '@/constants/listPerf';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { Tabs } from '@/components/ui/Tabs';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAsistencia } from '@/hooks/useAsistencia';
import { useStableCallback } from '@/hooks/useStableCallback';
import { DateRangeFilterModal } from '@/components/screens/asistencia/DateRangeFilterModal';
import { AsistenciaCard } from '@/components/asistencia/AsistenciaCard';
import { useCallback, useState } from 'react';
import {
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
    surfaceMuted,
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
    ({ item, index }: { item: any; index: number }) => (
      <AsistenciaCard
        item={item}
        index={index}
        activeTab={activeTab}
        isDark={isDark}
        accentColor={accentColor}
        cardBg={cardBg}
        surfaceMuted={surfaceMuted}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
        formatDate={formatDate}
        normalizeEstado={normalizeEstado}
      />
    ),
  );

  if (loading)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader
          title="Asistencia"
          rightComponent={
            <PremiumHeaderActions onlyTheme
              showAlert={showAlert}
              profilePath="/barman/perfil"
            />
          }
        />
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
        <PremiumHeader
          title="Asistencia"
          rightComponent={
            <PremiumHeaderActions onlyTheme
              showAlert={showAlert}
              profilePath="/barman/perfil"
            />
          }
        />
        <EmployeeListError message={error} onRetry={onRefresh} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Asistencia"
        subtitle="Registro de turnos y bonificaciones"
        rightComponent={
          <PremiumHeaderActions onlyTheme
            showAlert={showAlert}
            profilePath="/barman/perfil"
          />
        }
      />
      <Tabs
        tabs={[
          { key: 'asistencias', label: 'Turnos', icon: 'calendar-outline' },
          { key: 'gratificaciones', label: 'Gratificaciones', icon: 'gift-outline' },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

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
          dateFilterLabel="Fechas"
          onDateFilterPress={() => setDateFilterVisible(true)}
          accentColor={accentColor}
          cardBg={cardBg}
          textSecondary={textSecondary}
          borderColor={borderColor}
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
          <EmptyState icon="clipboard-outline" title="No se encontraron registros" message="No hay registros de asistencia para los criterios seleccionados. Intenta ajustar el filtro de fechas." />
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
    borderRadius: BorderRadius.full,
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
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});
