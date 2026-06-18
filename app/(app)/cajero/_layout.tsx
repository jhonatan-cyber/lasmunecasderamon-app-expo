import { Stack } from "expo-router";
import { useAccentColor } from "@/hooks/useAccentColor";
import { GlobalTimerAlert } from "@/components/cajero/GlobalTimerAlert";

export default function CajeroLayout() {
  const { isDark } = useAccentColor();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? "#000000" : "#FFFFFF" },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="personal"
          options={{ title: "Personal", headerShown: false }}
        />
        <Stack.Screen name="perfil" options={{ title: "Mi Perfil" }} />
        <Stack.Screen
          name="administrativo"
          options={{ title: "Resumen Personal", headerShown: false }}
        />
        <Stack.Screen
          name="gratificaciones"
          options={{ title: "Gratificaciones", headerShown: false }}
        />
        <Stack.Screen
          name="ventas"
          options={{ title: "Ventas", headerShown: false }}
        />
        <Stack.Screen
          name="cuentas"
          options={{ title: "Cuentas", headerShown: false }}
        />
        <Stack.Screen name="solicitudes" options={{ title: "Solicitudes" }} />
        <Stack.Screen
          name="nuevo-servicio"
          options={{ title: "Nuevo Servicio", headerShown: false }}
        />
        <Stack.Screen
          name="servicios"
          options={{ title: "Servicios Activos", headerShown: false }}
        />
        <Stack.Screen
          name="clientes"
          options={{ title: "Clientes", headerShown: false }}
        />
      </Stack>
      <GlobalTimerAlert />
    </>
  );
}
