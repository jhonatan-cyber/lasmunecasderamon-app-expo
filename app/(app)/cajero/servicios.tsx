import { ServiciosScreen } from '@/components/screens/ServiciosScreen';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function CajeroServiciosScreen() {
  const esAdmin = useIsAdmin();
  return <ServiciosScreen variant={esAdmin ? 'admin' : 'cajero'} />;
}
