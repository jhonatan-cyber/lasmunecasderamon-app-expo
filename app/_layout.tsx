import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DynamicSystemBars } from "@/components/ui/DynamicSystemBars";
import { NotificationProvider } from "@/context/NotificationContext";
import { SalesProvider } from "@/context/SalesContext";
import { TimerProvider } from "@/context/TimerContext";
import { useAuthStore } from "@/store/authStore";
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'setBackgroundColorAsync is not supported',
  'expo-notifications functionality is not fully supported',
  'Due to changes in Androids permission requirements',
  'MediaLibrary.getAssetsAsync',
  'The final value for the useLayoutEffect',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => { });
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

