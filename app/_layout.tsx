import { DynamicSystemBars } from "@/components/ui/DynamicSystemBars";
import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";
import { NotificationProvider } from "@/context/NotificationContext";
import { SalesProvider } from "@/context/SalesContext";
import { TimerProvider } from "@/context/TimerContext";
import { connectivity } from "@/services/connectivity";
import { initMirror } from "@/services/mirror";
import { initOutbox } from "@/services/outbox";
import { useAuthStore } from "@/store/authStore";
import { useModoPantallaStore } from "@/store/modoPantallaStore";
import { initSentry } from "@/utils/sentry";
import logger from "@/utils/logger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "expo-dev-client";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { prepareMirrorStorage } from "@/services/mirror/driver";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiClientSafe } from "@/api/client-safe";
import { configurationsSchema } from "@lasmunecasderamon/validations";
import { setExpensiveDrinkThreshold, setCardSplit, setIvaRate } from "@/hooks/utils/cuentaUtils";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppFonts } from "@/hooks/useAppFonts";
import { ThemeTokens } from "@/constants/colorTokens";
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "setBackgroundColorAsync is not supported",
  "expo-notifications functionality is not fully supported",
  "Due to changes in Androids permission requirements",
  "MediaLibrary.getAssetsAsync",
  "The final value for the useLayoutEffect",
]);

setTimeout(() => {
  void initSentry({ tracesSampleRate: 0 }).catch(() => {
    logger.debug('No se pudo inicializar el reporte de errores.');
  });
}, 0);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {
  logger.debug('SplashScreen.preventAutoHideAsync falló.');
});

if (!__DEV__) {
  Updates.checkForUpdateAsync()
    .then(({ isAvailable }) => {
      if (!isAvailable) return;
      return Updates.fetchUpdateAsync().then(() => Updates.reloadAsync());
    })
    .catch(() => {
    });
}

const MIRROR_STORAGE_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const [storageReady, setStorageReady] = useState(false);
  const fontsReady = useAppFonts();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const loadingTheme = isDark ? ThemeTokens.dark : ThemeTokens.light;
  useEffect(() => {
    let active = true;
    let settled = false;
    const markReady = (timedOut: boolean) => {
      if (!active || settled) return;
      settled = true;
      if (timedOut) {
        logger.debug('El almacenamiento offline no respondió a tiempo; se arranca sin espejo.');
      }
      initMirror();
      setStorageReady(true);
    };
    const timeout = setTimeout(() => markReady(true), MIRROR_STORAGE_TIMEOUT_MS);
    void prepareMirrorStorage().catch(() => {
      logger.debug('El almacenamiento offline no está disponible en este dispositivo.');
    }).finally(() => {
      clearTimeout(timeout);
      markReady(false);
    });
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const cargarModoPantalla = useModoPantallaStore((state) => state.cargar);
  const modoPantallaCargado = useModoPantallaStore((state) => state.cargado);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    void cargarModoPantalla();
  }, [cargarModoPantalla]);

  useEffect(() => {
    if (isLoading || !storageReady) return;
    SplashScreen.hideAsync().catch(() => {
      logger.debug('SplashScreen.hideAsync falló.');
    });

    const startServices = () => {
      void connectivity.start();
      initOutbox();

      if (user !== null) {
        apiClientSafe('/configurations', { retries: 1 }).then((res: any) => {
          if (!res?.success) return;
          const parsed = configurationsSchema.safeParse(res.data);
          if (!parsed.success) return;
          const data = parsed.data;
          if (data?.comisiones) {
            const c = data.comisiones;
            if (c.threshold_producto_caro) setExpensiveDrinkThreshold(Number(c.threshold_producto_caro));
            if (c.split_tarjeta_venta && c.split_tarjeta_propina) {
              setCardSplit(Number(c.split_tarjeta_venta) / 100, Number(c.split_tarjeta_propina) / 100);
            }
          }
          if (data?.facturacion?.impuesto_iva) {
            setIvaRate(Number(data.facturacion.impuesto_iva) / 100);
          }
        }).catch(() => {
          logger.debug('No se pudieron cargar las configuraciones del servidor.');
        });
      }
    };

    startServices();
  }, [isLoading, storageReady, user]);

  if (isLoading || !storageReady || !modoPantallaCargado || !fontsReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: loadingTheme.background,
        }}
      >
        <ActivityIndicator size="large" color={loadingTheme.textPrimary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NotificationProvider>
          <SalesProvider>
            <TimerProvider>
              <DynamicSystemBars />
              <AppErrorBoundary>
                <Slot />
              </AppErrorBoundary>
            </TimerProvider>
          </SalesProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
