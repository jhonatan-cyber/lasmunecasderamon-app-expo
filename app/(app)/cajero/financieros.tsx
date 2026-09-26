import { Stack, useRouter } from 'expo-router';
import { FinancialEventsScreen } from '@/components/screens/FinancialEventsScreen';

/**
 * Eventos Financieros del cajero (type=propinas — las propinas se reparten a
 * cajero/garzón/barman). Se abre desde el enlace FINANCIERO del home
 * (CajeroActionGrid), en paridad con Flutter (/cajero/financieros).
 */
export default function CajeroFinancierosScreen() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <FinancialEventsScreen
                title="Eventos Financieros"
                subtitle="Propinas"
                type="propinas"
                onBack={() => router.back()}
            />
        </>
    );
}
