import { Redirect } from 'expo-router';

import ColacionesScreen from '@/components/screens/ColacionesScreen';
import { useAuthStore } from '@/store/authStore';
import { isAdminRole, isCajeroRole, isGarzonRole, isHostessRole } from '@/utils/userRole';

// Anfitriona, garzón y cajero reciben colación, pero no la registran: no tienen
// la tarjeta en su inicio, y un enlace directo a /cajero/colaciones tampoco debe
// dejarles registrar por otros. Solo administración puede registrar.
export default function CajeroColacionesRoute() {
  const user = useAuthStore((state) => state.user);

  if (isGarzonRole(user)) return <Redirect href="/(app)/garzon/(tabs)" />;
  if (isHostessRole(user)) return <Redirect href="/(app)/anfitriona/(tabs)" />;
  if (isCajeroRole(user) && !isAdminRole(user)) return <Redirect href="/(app)/cajero/(tabs)" />;

  return <ColacionesScreen />;
}
