import { Stack, useRouter } from 'expo-router';
import { AnalyticsScreen } from '@/components/screens/AnalyticsScreen';

/**
 * Analíticas del garzón. Se abre desde la tarjeta ANALÍTICAS del home,
 * en paridad con Flutter (`/garzon/analytics`).
 */
export default function GarzonAnalyticsScreen() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <AnalyticsScreen onBack={() => router.back()} />
        </>
    );
}
