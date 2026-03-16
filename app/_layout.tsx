import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DynamicSystemBars } from "../components/DynamicSystemBars";
import { NotificationProvider } from "../context/NotificationContext";
import { SalesProvider } from "../context/SalesContext";
import { TimerProvider } from "../context/TimerContext";
import { useAuthStore } from "../store/authStore";

LogBox.ignoreLogs([
  // Evitar ruido de SafeAreaView heredado de librerías externas
  'SafeAreaView has been deprecated',
]);

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const { isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  );
}

