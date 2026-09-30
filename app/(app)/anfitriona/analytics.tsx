import { Stack, useRouter } from 'expo-router';
import { AnalyticsScreen } from '@/components/screens/AnalyticsScreen';

/**
 * Analíticas de la anfitriona. Se abre desde la tarjeta «Analíticas» del
 * home, en paridad con Flutter (`/anfitriona/analytics`).
 */
export default function AnfitrionaAnalyticsScreen() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <AnalyticsScreen onBack={() => router.back()} />
        </>
    );
}
