import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function GarzonLayout() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#0F0D2E' : '#FFFFFF' },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerTitleStyle: { fontWeight: '900' },
        }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pedidos" options={{ headerShown: false }} />
            <Stack.Screen name="productos" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
            <Stack.Screen name="servicios" options={{ headerShown: false }} />
        </Stack>
    );
}
