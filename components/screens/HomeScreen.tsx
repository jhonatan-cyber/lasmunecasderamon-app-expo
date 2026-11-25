import { styles } from "./HomeScreen.styles";
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { apiClientSafe } from '@/api/client';
import { ActiveServiceCard } from '@/components/anfitriona/ActiveServiceCard';
import { BarmanActionGrid } from '@/components/barman/BarmanActionGrid';
import { CajeroActionGrid } from '@/components/cajero/CajeroActionGrid';
import { PremiumUserProfile } from '@/components/shared/PremiumUserProfile';
import { RegistroAsistenciaModal } from '@/components/shared/RegistroAsistenciaModal';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { HomeScreenSkeleton } from '@/components/screens/home/HomeScreenSkeleton';
import { AnfitrionaAnalyticsSection } from '@/components/screens/home/AnfitrionaAnalyticsSection';
import { GarzonHomeActions } from '@/components/screens/home/GarzonHomeActions';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePendingSolicitudesCount } from '@/hooks/usePendingSolicitudesCount';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { contentColumn, tabBarBottomPadding } from '@/constants/layout';
import { useAuthStore } from '@/store/authStore';
import {
  RefreshControl,
  Text as RNText,
  ScrollView,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAlpha } from '@/utils/color';

import { useRouter } from 'expo-router';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { OnboardingTour } from '@/components/ui/OnboardingTour';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/utils/toast-lazy';
interface HomeScreenProps {
  role: 'anfitriona' | 'garzon' | 'cajero' | 'barman';
}

export function HomeScreen({ role }: HomeScreenProps) {
  const {
    accentColor,
    accentText,
    accentGlow,
    gradientText,
    gradientTextMuted,
    gradientControlBg,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
  } = useAccentColor();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useResponsiveMetrics();
  const headerCompact = isLandscape && !isTablet;
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { bloqueado } = useCajaAbierta();

  const {
    loading,
    refreshing,
    error,
    stats,
    userStatus,
    hasNewAlert,
    activeService,
    pendingOrders,
    pendingTransfers,
    pendingAdvances,
    onRefresh,
    setHasNewAlert,
  } = useDashboardData(role);
  const pendingSolicitudesCount = usePendingSolicitudesCount(role === 'cajero');

  const [alertConfig, setAlertConfig] = useState<any>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingChecked = useRef(false);

  // Show onboarding only once per user
  useEffect(() => {
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;
    const completed = user?.hasCompletedOnboarding;
    if (!completed) {
      setTimeout(() => setShowOnboarding(true), 800);
    }
  }, [user]);

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

  if (loading)
    return (
      <HomeScreenSkeleton
        bg={bg}
        gradientColors={[accentColor, accentColor, accentColor]}
        topInset={insets.top}
      />
    );

  // Gradiente sutil en el header para dar profundidad
  const headerGradientColors = [
    accentColor,
    withAlpha(accentColor, 0.85),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={headerGradientColors as any}
        style={[
          styles.header,
          {
            boxShadow: accentGlow,
            paddingTop: insets.top + (headerCompact ? 4 : 10),
            paddingBottom: headerCompact ? 12 : 25,
            borderBottomLeftRadius: headerCompact ? 24 : 32,
            borderBottomRightRadius: headerCompact ? 24 : 32,
          },
        ]}
      >
        <PremiumHeaderActions
          hasNewAlert={hasNewAlert}
          setHasNewAlert={setHasNewAlert}
          showAlert={showAlert}
          profilePath={`/${role}/perfil`}
          onQRScannerPress={() => setShowAsistenciaModal(true)}
          notificationCount={role === 'cajero' ? pendingSolicitudesCount : 0}
          onNotificationPress={
            role === 'cajero'
              ? () => router.push('/cajero/solicitudes')
              : undefined
          }
        />
        <PremiumUserProfile
          user={user}
          userStatus={userStatus}
          role={role}
          gradientText={gradientText}
          gradientTextMuted={gradientTextMuted}
          controlBg={gradientControlBg}
        />

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
              <RNText style={[styles.callStaffBtnText, { color: accentText }]}>
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
        contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}
      >
        <AnimatedScreen>
          {error && (
            <EmployeeListError
              message="No pudimos cargar tu actividad. Revisá tu conexión e intentá de nuevo."
              onRetry={onRefresh}
            />
          )}
          <View style={[contentColumn, { padding: 16 }]}>
            {role === 'anfitriona' && activeService && (
              <ActiveServiceCard
                habitacion={activeService.habitacion}
                onPress={() => router.push('/(app)/anfitriona/(tabs)/servicios' as any)}
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
                onOpenResumen={() => router.push('/anfitriona/resumen')}
              />
            )}

            {role === 'garzon' && (
              <GarzonHomeActions
                bloqueado={bloqueado}
                accentColor={accentColor}
                pendingOrders={pendingOrders}
                onOpenPedidos={() => router.push('/garzon/pedidos')}
                onOpenServicios={() => router.push('/garzon/servicios')}
                onOpenEntradas={() => router.push('/garzon/entradas')}
                onOpenResumen={() => router.push('/garzon/resumen')}
              />
            )}

            {role === 'cajero' && (
              <CajeroActionGrid
                pendingAdvances={pendingAdvances}
              />
            )}

            {role === 'barman' && (
              <BarmanActionGrid bloqueado={bloqueado} pendingTransfers={pendingTransfers} />
            )}

          </View>
        </AnimatedScreen>
      </ScrollView>

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
      <OnboardingTour
        role={role}
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </View>
  );
}
