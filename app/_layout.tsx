import { DynamicSystemBars } from "@/components/ui/DynamicSystemBars";
import { NotificationProvider } from "@/context/NotificationContext";
import { SalesProvider } from "@/context/SalesContext";
import { TimerProvider } from "@/context/TimerContext";
import { connectivity } from "@/services/connectivity";
import { initMirror } from "@/services/mirror";
import { initOutbox } from "@/services/outbox";
import { useAuthStore } from "@/store/authStore";
import { useModoPantallaStore } from "@/store/modoPantallaStore";
import { initSentry } from "@/utils/sentry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "expo-dev-client";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, Platform, View } from "react-native";
import { prepareMirrorStorage } from "@/services/mirror/driver";
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

setTimeout(() => {
  void initSentry({ tracesSampleRate: 0 }).catch(() => {
    console.info('No se pudo inicializar el reporte de errores.');
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
  const [storageReady, setStorageReady] = useState(Platform.OS !== 'web');
  useEffect(() => {
    let active = true;
    void prepareMirrorStorage().catch(() => {
      console.info('El almacenamiento offline no está disponible en este dispositivo.');
    }).finally(() => { if (active) setStorageReady(true); });
    return () => { active = false; };
  }, []);
  const isLoading = useAuthStore((state) => state.isLoading);
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
    SplashScreen.hideAsync().catch(() => {});

    const startServices = () => {
      void connectivity.start();
      initMirror();
      initOutbox();

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
      }).catch(() => {});
    };

    if (typeof requestIdleCallback === "function") {
      const task = requestIdleCallback(startServices, { timeout: 1000 });
      return () => cancelIdleCallback(task);
    }
    const task = setTimeout(startServices, 0);
    return () => clearTimeout(task);
  }, [isLoading, storageReady]);

  if (isLoading || !storageReady || !modoPantallaCargado) {
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
