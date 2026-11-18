import { Redirect } from 'expo-router';

import GarzonEntradasScreen from '../garzon/entradas';
import { useAuthStore } from '@/store/authStore';
import { isAdminRole, isCajeroRole } from '@/utils/userRole';

// El cajero no registra entradas: no tiene la tarjeta en su inicio, y un enlace
// directo a /cajero/entradas lo regresa a su home. Solo administración puede
// cobrar entradas desde esta pantalla; el garzón usa su propia ruta.
export default function CajeroEntradasRoute() {
  const user = useAuthStore((state) => state.user);

  if (isCajeroRole(user) && !isAdminRole(user)) return <Redirect href="/(app)/cajero/(tabs)" />;

  return <GarzonEntradasScreen />;
}
