import { Redirect, Stack, useSegments } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { isAdminRole, isBarmanRole } from "@/utils/userRole";
import { rutaExigeAdmin } from "@/utils/adminGate";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useCajaAbierta } from "@/hooks/useCajaAbierta";
import { rutaRequiereCajaAbierta } from "@/utils/cajaGate";
import { GlobalTimerAlert } from "@/components/cajero/GlobalTimerAlert";

export default function CajeroLayout() {
  const { isDark } = useAccentColor();
  const user = useAuthStore((state) => state.user);
  const { bloqueado } = useCajaAbierta();
  const segmentos = useSegments();

  if (isBarmanRole(user)) return <Redirect href="/(app)/barman/(tabs)" />;

  if (rutaExigeAdmin(segmentos) && !isAdminRole(user)) {
    return <Redirect href="/(app)/cajero/(tabs)" />;
  }
  if (bloqueado && rutaRequiereCajaAbierta(segmentos)) {
    return <Redirect href="/(app)/cajero/(tabs)" />;
  }

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
          name="pendientes"
          options={{ title: "Pendientes", headerShown: false }}
        />
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
        <Stack.Screen
          name="cortesias"
          options={{ title: "Cortesías", headerShown: false }}
        />
        <Stack.Screen
          name="configuracion-asistencia"
          options={{ title: "Configuración", headerShown: false }}
        />
      </Stack>
      <GlobalTimerAlert />
    </>
  );
}
