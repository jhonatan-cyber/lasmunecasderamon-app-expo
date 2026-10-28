import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import {
  RUTA_PANTALLA_ASISTENCIA,
  useModoPantallaStore,
} from "@/store/modoPantallaStore";
import {
  isAdminRole,
  isBarmanRole,
  isCajeroRole,
  isGarzonRole,
  isHostessRole,
} from "@/utils/userRole";

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const enModoPantalla = useModoPantallaStore((state) => state.activo);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // El dispositivo está configurado como pantalla de asistencia: no hay panel.
  if (enModoPantalla) {
    return <Redirect href={RUTA_PANTALLA_ASISTENCIA} />;
  }

  if (user.forcePasswordChange) {
    return <Redirect href="/(auth)/change-password" />;
  }

  if (isGarzonRole(user)) {
    return <Redirect href="/(app)/garzon/(tabs)" />;
  } else if (isHostessRole(user)) {
    return <Redirect href="/(app)/anfitriona/(tabs)" />;
  } else if (isBarmanRole(user)) {
    return <Redirect href="/(app)/barman/(tabs)" />;
  } else if (isCajeroRole(user) || isAdminRole(user)) {
    return <Redirect href="/(app)/cajero/(tabs)" />;
  }

  return <Redirect href="/(app)/garzon/(tabs)" />;
}
