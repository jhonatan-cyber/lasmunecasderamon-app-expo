import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import {
  isAdminRole,
  isCajeroRole,
  isGarzonRole,
  isHostessRole,
} from "@/utils/userRole";

export default function Index() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isGarzonRole(user)) {
    return <Redirect href="/(app)/garzon/(tabs)" />;
  } else if (isHostessRole(user)) {
    return <Redirect href="/(app)/anfitriona/(tabs)" />;
  } else if (isCajeroRole(user) || isAdminRole(user)) {
    return <Redirect href="/(app)/cajero/(tabs)" />;
  }

  return <Redirect href="/(app)/garzon/(tabs)" />;
}
