import { DynamicSystemBars } from "@/components/ui/DynamicSystemBars";
import { NotificationProvider } from "@/context/NotificationContext";
import { SalesProvider } from "@/context/SalesContext";
import { TimerProvider } from "@/context/TimerContext";
import { connectivity } from "@/services/connectivity";
import { initMirror } from "@/services/mirror";
import { initOutbox } from "@/services/outbox";
import { useAuthStore } from "@/store/authStore";
import { initSentry } from "@/utils/sentry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "expo-dev-client";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, InteractionManager, LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiClientSafe } from "@/api/client-safe";
import { configurationsSchema } from "@lasmunecasderamon/validations";
import { setExpensiveDrinkThreshold, setCardSplit, setIvaRate } from "@/hooks/utils/cuentaUtils";
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "setBackgroundColorAsync is not supported",
  "expo-notifications functionality is not fully supported",
  "Due to changes in Androids permission requirements",
  "MediaLibrary.getAssetsAsync",
  "The final value for the useLayoutEffect",
]);

// Init Sentry lazily — deferred out of the critical render path.
// Sin EXPO_PUBLIC_SENTRY_DSN, initSentry es no-op (no carga el SDK de ~1.8 MB).
setTimeout(() => {
  void initSentry({ tracesSampleRate: 0 });
}, 0);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Post-splash: primero se muestra la UI, después el trabajo pesado
  // (SQLite, outbox, red, /configurations) fuera del path crítico de arranque.
  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync().catch(() => {});

    const task = InteractionManager.runAfterInteractions(() => {
      // Cimientos del modo offline: ninguno lanza; si algo no está
      // disponible, la app sigue funcionando igual.
      void connectivity.start();
      initMirror();
      initOutbox();

      apiClientSafe('/configurations', { retries: 1 }).then((res: any) => {
        // Validado con zod: ante un deploy a medias el backend puede mandar
        // null/formas raras; se ignora en vez de romper umbrales con NaN.
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
      }).catch(() => {});
    });

    return () => task.cancel();
  }, [isLoading]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
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
              <Slot />
            </TimerProvider>
          </SalesProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
