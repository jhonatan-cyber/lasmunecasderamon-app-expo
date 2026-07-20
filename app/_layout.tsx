import { DynamicSystemBars } from "@/components/ui/DynamicSystemBars";
import { NotificationProvider } from "@/context/NotificationContext";
import { SalesProvider } from "@/context/SalesContext";
import { TimerProvider } from "@/context/TimerContext";
import { useAuthStore } from "@/store/authStore";
import { initSentry } from "@/utils/sentry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "expo-dev-client";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiClientSafe } from "@/api/client-safe";
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
// The SDK (~1.8 MB) is loaded asynchronously on first idle.
setTimeout(() => {
  void initSentry({
    dsn:
      process.env.EXPO_PUBLIC_SENTRY_DSN ||
      "https://placeholder@example.ingest.sentry.io/placeholder",
    tracesSampleRate: 0,
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

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    apiClientSafe('/configurations', { retries: 1 }).then((res: any) => {
      if (res?.success && res?.data?.comisiones) {
        const c = res.data.comisiones;
        if (c.threshold_producto_caro) setExpensiveDrinkThreshold(Number(c.threshold_producto_caro));
        if (c.split_tarjeta_venta && c.split_tarjeta_propina) {
          setCardSplit(Number(c.split_tarjeta_venta) / 100, Number(c.split_tarjeta_propina) / 100);
        }
      }
      if (res?.success && res?.data?.facturacion?.impuesto_iva) {
        setIvaRate(Number(res.data.facturacion.impuesto_iva) / 100);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
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
