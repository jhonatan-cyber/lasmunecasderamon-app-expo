import { styles } from "./HomeScreen.styles";
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { apiClientSafe } from '@/api/client';
import { ActiveServiceCard } from '@/components/anfitriona/ActiveServiceCard';
import { BarmanActionGrid } from '@/components/barman/BarmanActionGrid';
import { CajeroActionGrid } from '@/components/cajero/CajeroActionGrid';
import { CajeroStats } from '@/components/cajero/CajeroStats';
import { EventDetailModal } from '@/components/shared/EventDetailModal';
import { PremiumLiquidationCard } from '@/components/shared/PremiumLiquidationCard';
import { PremiumUserProfile } from '@/components/shared/PremiumUserProfile';
import { RegistroAsistenciaModal } from '@/components/shared/RegistroAsistenciaModal';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumCalendar } from '@/components/ui/PremiumCalendar';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { HomeScreenSkeleton } from '@/components/screens/home/HomeScreenSkeleton';
import { AnfitrionaAnalyticsSection } from '@/components/screens/home/AnfitrionaAnalyticsSection';
import { GarzonHomeActions } from '@/components/screens/home/GarzonHomeActions';
import { SelectedEventsBar } from '@/components/screens/home/SelectedEventsBar';
import { SelectedEventsModal } from '@/components/screens/home/SelectedEventsModal';
import {
  filterEventsByDates,
  getEventLabel,
  getStatusLabel,
} from '@/components/screens/home/eventLabels';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuthStore } from '@/store/authStore';
import {
  RefreshControl,
  Text as RNText,
  ScrollView,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useCallback, useMemo, useState } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/utils/toast-lazy';

import logger from '@/utils/logger';
interface HomeScreenProps {
  role: 'anfitriona' | 'garzon' | 'cajero' | 'barman';
}

export function HomeScreen({ role }: HomeScreenProps) {
  const compactHome = role === 'cajero' || role === 'barman';
  const {
    accentColor,
    gradientColors,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
  } = useAccentColor();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { bloqueado } = useCajaAbierta();
  const esAdmin = useIsAdmin();

  const {
    loading,
    refreshing,
    error,
    events,
    stats,
    userStatus,
    hasNewAlert,
    selectedDates,
    activeService,
    pendingCount,
    payoutTotal,
    onRefresh,
    setSelectedDates,
    setHasNewAlert,
  } = useDashboardData(role) as any;

  const [alertConfig, setAlertConfig] = useState<any>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

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

  const handleSelectEvent = async (item: any) => {
    setSelectedEvent(item);
    if (
      [
        'comision',
        'propina',
        'asistencia',
        'anticipo',
        'servicio',
        'venta',
      ].includes(item.type)
    ) {
      setLoadingDetail(true);
      try {
        const res = await apiClientSafe(
          `/events/detail/${item.id}?type=${item.type}`,
        );
        if (res.success) setEventDetail(res.data);
      } catch (e) {
        logger.captureException(e, { context: 'HomeScreen:handleSelectEvent' });
      } finally {
        setLoadingDetail(false);
      }
    }
  };


  const selectedEvents = useMemo(
    () => filterEventsByDates(events, selectedDates),
    [selectedDates, events],
  );

  if (loading)
    return (
      <HomeScreenSkeleton
        bg={bg}
        gradientColors={gradientColors as unknown as string[]}
        topInset={insets.top}
      />
    );

  if (error)
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <EmployeeListError
          message="No se pudo cargar tu actividad."
          onRetry={onRefresh}
        />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={
          gradientColors as unknown as readonly [string, string, ...string[]]
        }
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <PremiumHeaderActions
          hasNewAlert={hasNewAlert}
          setHasNewAlert={setHasNewAlert}
          showAlert={showAlert}
          profilePath={`/${role}/perfil`}
          onQRScannerPress={() => setShowAsistenciaModal(true)}
          onPersonalPress={
            role === 'cajero'
              ? () => router.push('/cajero/personal')
              : undefined
          }
          notificationCount={role === 'cajero' ? pendingCount : 0}
          onNotificationPress={
            role === 'cajero'
              ? () => router.push('/cajero/solicitudes')
              : undefined
          }
        />
        <PremiumUserProfile user={user} userStatus={userStatus} role={role} />

        {role === 'anfitriona' && !activeService && (
          <AnimatedView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: 15, alignItems: 'center' }}
          >
            <AnimatedButton
              style={[styles.callStaffBtn, { backgroundColor: accentColor }]}
              onPress={() =>
                showAlert(
                  'Atención',
                  '¿Solicitar asistencia general?',
                  'warning',
                  () => {
                    apiClientSafe('/notifications/assistance', {
                      method: 'POST',
                      body: JSON.stringify({ type: 'Llamado' }),
                    });
                    showToast({ type: 'success', text1: 'Enviado' });
                  },
                  true,
                )
              }
            >
              <RNText style={styles.callStaffBtnText}>
                SOLICITAR SERVICIO
              </RNText>
            </AnimatedButton>
          </AnimatedView>
        )}
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <AnimatedScreen>
          <View style={{ padding: compactHome ? 0 : 16 }}>
            {role === 'anfitriona' && activeService && (
              <ActiveServiceCard
                habitacion={activeService.habitacion}
                onPress={() => router.push('/anfitriona/servicios')}
              />
            )}

            {role === 'anfitriona' && (
              <AnfitrionaAnalyticsSection
                totalEarnings={stats.totalEarnings}
                accentColor={accentColor}
                isDark={isDark}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                onOpenAnalytics={() => router.push('/anfitriona/analytics')}
              />
            )}

            {role === 'garzon' && (
              <GarzonHomeActions
                bloqueado={bloqueado}
                accentColor={accentColor}
                onOpenPedidos={() => router.push('/garzon/pedidos')}
                onOpenServicios={() => router.push('/garzon/servicios')}
                onOpenEntradas={() => router.push('/garzon/entradas')}
              />
            )}

            {role === 'cajero' && (
              <>
                <CajeroStats stats={stats} fullWidth hideFullWidth={esAdmin} />
                <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
                  <CajeroActionGrid fullWidth />
                </View>
              </>
            )}

            {role === 'barman' && (
              <>
                <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
                  <BarmanActionGrid fullWidth />
                </View>
              </>
            )}

            {!compactHome && (
              <View style={{ marginTop: 20, paddingHorizontal: 0 }}>
                <PremiumLiquidationCard
                  user={user}
                  events={events}
                  totalAmount={payoutTotal}
                />
              </View>
            )}

            {!esAdmin && (
              <PremiumCalendar
                events={events}
                selectedDates={selectedDates}
                onDateToggle={(d) => {
                  const next = selectedDates.includes(d)
                    ? selectedDates.filter((x: any) => x !== d)
                    : [...selectedDates, d];
                  setSelectedDates(next);
                }}
              />
            )}
          </View>
        </AnimatedScreen>
      </ScrollView>

      {selectedDates.length > 0 && (
        <SelectedEventsBar
          count={selectedDates.length}
          cardBg={cardBg}
          accentColor={accentColor}
          textPrimary={textPrimary}
          onOpenDetails={() => setIsModalVisible(true)}
        />
      )}

      <SelectedEventsModal
        visible={isModalVisible}
        events={selectedEvents}
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        accentColor={accentColor}
        onClose={() => setIsModalVisible(false)}
        onSelect={handleSelectEvent}
      />

      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        eventDetail={eventDetail}
        loadingDetail={loadingDetail}
        onClose={() => setSelectedEvent(null)}
        getEventLabel={getEventLabel}
        getStatusLabel={getStatusLabel}
      />
      <RegistroAsistenciaModal
        visible={showAsistenciaModal}
        onClose={() => setShowAsistenciaModal(false)}
        onRegistered={() => setShowAsistenciaModal(false)}
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
