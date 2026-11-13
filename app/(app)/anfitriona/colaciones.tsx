import { Redirect } from 'expo-router';

import ColacionesScreenAnfitriona from '@/components/screens/ColacionesScreenAnfitriona';
import { useAuthStore } from '@/store/authStore';
import { isGarzonRole, isHostessRole } from '@/utils/userRole';

// Igual que en /cajero/colaciones: anfitriona y garzón quedan fuera aunque
// entren por enlace, porque solo reciben colación y no la registran.
export default function AnfitrionaColacionesRoute() {
  const user = useAuthStore((state) => state.user);

  if (isGarzonRole(user)) return <Redirect href="/(app)/garzon/(tabs)" />;
  if (isHostessRole(user)) return <Redirect href="/(app)/anfitriona/(tabs)" />;

  return <ColacionesScreenAnfitriona />;
}
