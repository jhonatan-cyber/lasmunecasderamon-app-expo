import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import {
  RUTA_PANTALLA_ASISTENCIA,
  useModoPantallaStore,
} from "@/store/modoPantallaStore";
import { getHomeRouteByRole } from "@/utils/userRole";

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const enModoPantalla = useModoPantallaStore((state) => state.activo);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (enModoPantalla) {
    return <Redirect href={RUTA_PANTALLA_ASISTENCIA} />;
  }

  if (user.forcePasswordChange) {
    return <Redirect href="/(auth)/change-password" />;
  }

  const homeRoute = getHomeRouteByRole(user);
  return <Redirect href={homeRoute ?? "/(auth)/login"} />;
}
