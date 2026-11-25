import { Stack, useRouter } from 'expo-router';
import { FinancialEventsScreen } from '@/components/screens/FinancialEventsScreen';

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
