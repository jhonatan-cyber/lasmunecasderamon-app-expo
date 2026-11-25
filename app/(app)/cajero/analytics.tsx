import { Stack, useRouter } from 'expo-router';
import { AnalyticsScreen } from '@/components/screens/AnalyticsScreen';

export default function CajeroAnalyticsScreen() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <AnalyticsScreen onBack={() => router.back()} />
        </>
    );
}
