import { Redirect } from 'expo-router';

import ColacionesScreen from '@/components/screens/ColacionesScreen';
import { useAuthStore } from '@/store/authStore';
import { getHomeRouteByRole, isBarmanRole } from '@/utils/userRole';

// La colación la entrega el barman. Cualquier otro rol vuelve a su inicio
// aunque entre por enlace directo.
export default function BarmanColacionesRoute() {
  const user = useAuthStore((state) => state.user);

  if (!isBarmanRole(user)) return <Redirect href={getHomeRouteByRole(user)} />;

  return <ColacionesScreen />;
}
