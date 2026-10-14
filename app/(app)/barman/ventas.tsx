import { Redirect, type Href } from 'expo-router';

export default function VentasScreen() {
  return <Redirect href={'/(app)/barman/pedidos' as Href} />;
}
