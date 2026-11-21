import { AnimatedView } from '@/components/ui/AnimatedView';
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { AdvanceCard } from '@/components/ui/AdvanceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterTabs } from '@/components/ui/FilterTabs';
import type { TabItem } from '@/components/ui/Tabs';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { LIST_PERF_PROPS } from '@/constants/listPerf';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import {
  Anticipo,
  useAnticipos,
  type FiltroAnticipos,
} from '@/hooks/useAnticipos';
import { useStableCallback } from '@/hooks/useStableCallback';
import { showToast } from '@/utils/toast-lazy';
import { SolicitarAnticipoModal } from '@/components/screens/anticipos/SolicitarAnticipoModal';
import { AnticipoDetailModal } from '@/components/screens/anticipos/AnticipoDetailModal';
import { useCallback, useState } from 'react';

export default function AnticiposScreen() {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor, accentOnSurface} = useAccentColor();
  const { bloqueado } = useCajaAbierta();

  const {
    loading,
    refreshing,
    error,
    selectedAnticipo,
    modalVisible,
    setModalVisible,
    montoMaximo,
    montoAsistencia,
    montoComisiones,
    montoPropinas,
    tieneSolicitudPendiente,
    efectivoEnCaja,
    filter,
    setFilter,
    filteredData,
    todos,
    pendientes,
    totalPendiente,
    totalGeneral,
    normalizeEstado,
    handleAnticipoPress,
    formatDate,
    formatTime,
    fetchAnticipos,
    fetchMaximo,
    solicitarAnticipo,
    onRefresh,
  } = useAnticipos();

  const filterCounts = {
    all: todos.length,
    pendiente: 0,
    aprobado: 0,
    rechazado: 0,
    recibido: 0,
  };
  for (const anticipo of todos) {
    const estado = normalizeEstado(anticipo.estado);
    if (estado === 'pendiente') filterCounts.pendiente += 1;
    else if (estado === 'confirmada') filterCounts.aprobado += 1;
    else if (estado === 'rechazada') filterCounts.rechazado += 1;
    else if (estado === 'pagada' || estado === 'liquidada')
      filterCounts.recibido += 1;
  }

  const filterTabs: TabItem<FiltroAnticipos>[] = [
    { key: 'all', label: 'Todas', count: filterCounts.all },
    { key: 'pendiente', label: 'Pendientes', count: filterCounts.pendiente },
    { key: 'aprobado', label: 'Aprobadas', count: filterCounts.aprobado },
    { key: 'rechazado', label: 'Rechazadas', count: filterCounts.rechazado },
    { key: 'recibido', label: 'Recibidas', count: filterCounts.recibido },
  ];

  const [solicitarModalVisible, setSolicitarModalVisible] = useState(false);
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

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

  const canRequestAdvance = montoMaximo > 0;

  const handleMontoChange = (text: string) => {
    const cleanNumber = text.replace(/[^0-9]/g, '');
    if (!cleanNumber) {
      setMonto('');
      return;
    }
    setMonto(parseInt(cleanNumber, 10).toLocaleString('es-CL'));
  };

  const handleSolicitar = async () => {
    const montoNum = parseFloat(monto.replace(/\./g, ''));
    if (!montoNum || montoNum <= 0) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Ingresa un monto válido',
      });
      return;
    }
    if (montoNum > montoMaximo) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: `El monto máximo es $${montoMaximo.toLocaleString()}`,
      });
      return;
    }
    setSendingRequest(true);
    const success = await solicitarAnticipo(montoNum, motivo);
    if (success) {
      setSolicitarModalVisible(false);
      setMonto('');
      setMotivo('');
    }
    setSendingRequest(false);
  };

  const openSolicitarModal = async () => {
    const availability = await fetchMaximo();
    if (!availability) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo cargar el saldo disponible. Reintenta.',
      });
      return;
    }
    if (availability.tiene_solicitud_pendiente) {
      showToast({
        type: 'info',
        text1: 'Solicitud pendiente',
        text2: 'Ya tienes una solicitud en espera',
      });
      return;
    }
    if (Number(availability.monto_maximo || 0) <= 0) {
      showToast({
        type: 'warning',
        text1: 'Sin saldo disponible',
        text2: 'No tienes monto disponible para solicitar anticipo',
      });
      return;
    }
    setSolicitarModalVisible(true);
  };


  const renderItem = useStableCallback(
    ({ item, index }: { item: Anticipo; index: number }) => (
      <AnimatedView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
      >
        <AdvanceCard
          item={item}
          index={index}
          showIndexBadge={false}
          compactDate={true}
          normalizeEstado={normalizeEstado}
          onPress={() => handleAnticipoPress(item)}
        />
      </AnimatedView>
    ),
  );

  const renderSkeleton = () => (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Anticipos"
        subtitle="Mis solicitudes y anticipos recibidos"
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
              <Skeleton width={80} height={20} borderRadius={10} />
              <Skeleton width={60} height={20} borderRadius={10} />
            </View>
            <Skeleton height={15} width="60%" style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <Skeleton width={80} height={30} />
              <Skeleton width={80} height={30} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) return renderSkeleton();

  if (error)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader
          title="Anticipos"
          rightComponent={
            <PremiumHeaderActions onlyTheme
              showAlert={showAlert}
              profilePath="/barman/perfil"
            />
          }
        />
        <EmployeeListError message={error} onRetry={() => fetchAnticipos()} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Anticipos"
        subtitle="Mis solicitudes y anticipos recibidos"
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
          {
            backgroundColor: cardBg,
            borderColor,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
          },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          ANTICIPOS PENDIENTES
        </Text>
        <Text style={[styles.summaryAmount, { color: accentOnSurface }]}>
          ${totalPendiente.toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Total: ${totalGeneral.toLocaleString()}
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
        tabs={filterTabs}
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
          title="No se pudieron cargar los anticipos"
          message={error}
          onRetry={() => fetchAnticipos()}
        />
      ) : null}

      <VirtualizedList
        data={filteredData}
        keyExtractor={(item: Anticipo) =>
          String((item as any).id_anticipo || item.id_solicitud)
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
          <EmptyState icon="card-outline" title="No se encontraron anticipos" message="No hay anticipos registrados para este período. Los anticipos aparecerán cuando se creen." />
        }
        {...LIST_PERF_PROPS}
      />

      {}
      <PremiumFAB
        icon="add"
        accessibilityLabel="Solicitar anticipo"
        onPress={openSolicitarModal}
        visible={true}
        withTabBar
        disabled={bloqueado}
      />

      {}
      <SolicitarAnticipoModal
        visible={solicitarModalVisible}
        isDark={isDark}
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        accentColor={accentColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        montoMaximo={montoMaximo}
        montoAsistencia={montoAsistencia}
        montoComisiones={montoComisiones}
        montoPropinas={montoPropinas}
        tieneSolicitudPendiente={tieneSolicitudPendiente}
        efectivoEnCaja={efectivoEnCaja}
        monto={monto}
        motivo={motivo}
        sendingRequest={sendingRequest}
        canRequestAdvance={canRequestAdvance}
        onChangeMonto={handleMontoChange}
        onChangeMotivo={setMotivo}
        onClose={() => setSolicitarModalVisible(false)}
        onSubmit={handleSolicitar}
      />

      {}
      <AnticipoDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        anticipo={selectedAnticipo}
        formatDate={formatDate}
        formatTime={formatTime}
        normalizeEstado={normalizeEstado}
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  summaryDetails: { flexDirection: 'row', gap: 16 },
  summaryDetail: { fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});
