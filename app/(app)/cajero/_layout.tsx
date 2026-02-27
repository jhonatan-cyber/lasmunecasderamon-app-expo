import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function CajeroLayout() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerTitleStyle: { fontWeight: '700' },
        }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ title: 'Mi Perfil' }} />
            <Stack.Screen name="administrativo" options={{ title: 'Resumen Administrativo', headerShown: false }} />
            <Stack.Screen name="ventas" options={{ title: 'Ventas', headerShown: false }} />
            <Stack.Screen name="cuentas" options={{ title: 'Cuentas' }} />
            <Stack.Screen name="solicitudes" options={{ title: 'Solicitudes' }} />
            <Stack.Screen name="nuevo-servicio" options={{ title: 'Nuevo Servicio', headerShown: false }} />
            <Stack.Screen name="servicios" options={{ title: 'Servicios Activos', headerShown: false }} />
        </Stack>
    );
}
