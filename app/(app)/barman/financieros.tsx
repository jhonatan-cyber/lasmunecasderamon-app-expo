import { Stack, useRouter } from 'expo-router';
import { FinancialEventsScreen } from '@/components/screens/FinancialEventsScreen';

/**
 * Eventos Financieros del barman (type=propinas — las propinas se reparten a
 * cajero/garzón/barman). Se abre desde el enlace FINANCIERO del home
 * (BarmanActionGrid), en paridad con Flutter (/barman/financieros).
 */
export default function BarmanFinancierosScreen() {
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
