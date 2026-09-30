import { Stack, useRouter } from 'expo-router';
import { AnalyticsScreen } from '@/components/screens/AnalyticsScreen';

/**
 * Analíticas del cajero. Se abre desde la acción ANALÍTICAS del home
 * (CajeroActionGrid), en paridad con Flutter (`/cajero/analytics`).
 */
export default function CajeroAnalyticsScreen() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <AnalyticsScreen onBack={() => router.back()} />
        </>
    );
}
