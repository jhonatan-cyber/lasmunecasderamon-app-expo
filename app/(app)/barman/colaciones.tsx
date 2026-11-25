import { Redirect } from 'expo-router';

import ColacionesScreen from '@/components/screens/ColacionesScreen';
import { useAuthStore } from '@/store/authStore';
import { getHomeRouteByRole, isBarmanRole } from '@/utils/userRole';

export default function BarmanColacionesRoute() {
  const user = useAuthStore((state) => state.user);

  if (!isBarmanRole(user)) return <Redirect href={getHomeRouteByRole(user) ?? '/(auth)/login'} />;

  return <ColacionesScreen />;
}
