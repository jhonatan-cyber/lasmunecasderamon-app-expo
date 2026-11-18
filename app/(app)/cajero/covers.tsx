import { Redirect } from 'expo-router';

import { CoversScreen } from '@/components/screens/CoversScreen';
import { useAuthStore } from '@/store/authStore';
import { isAdminRole, isCajeroRole } from '@/utils/userRole';

// El cajero no entrega covers: no tiene la tarjeta en su inicio, y un enlace
// directo a /cajero/covers lo regresa a su home. Solo administración conserva
// acceso desde esta pantalla.
export default function CajeroCoversRoute() {
  const user = useAuthStore((state) => state.user);

  if (isCajeroRole(user) && !isAdminRole(user)) return <Redirect href="/(app)/cajero/(tabs)" />;

  return <CoversScreen />;
}
