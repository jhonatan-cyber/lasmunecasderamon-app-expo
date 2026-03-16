import { Stack } from 'expo-router';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { GlobalTimerAlert } from '../../../components/cajero/GlobalTimerAlert';

export default function CajeroLayout() {
    const { accentColor, isDark } = useAccentColor();

    return (
        <>
            <Stack screenOptions={{
                headerStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
                headerTintColor: isDark ? '#FFFFFF' : '#000000',
                headerTitleStyle: { fontWeight: '700' },
            }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="personal" options={{ title: 'Personal', headerShown: false }} />
                <Stack.Screen name="perfil" options={{ title: 'Mi Perfil' }} />
                <Stack.Screen name="administrativo" options={{ title: 'Resumen Administrativo', headerShown: false }} />
                <Stack.Screen name="ventas" options={{ title: 'Ventas', headerShown: false }} />
                <Stack.Screen name="cuentas" options={{ title: 'Cuentas', headerShown: false }} />
                <Stack.Screen name="solicitudes" options={{ title: 'Solicitudes' }} />
                <Stack.Screen name="nuevo-servicio" options={{ title: 'Nuevo Servicio', headerShown: false }} />
                <Stack.Screen name="servicios" options={{ title: 'Servicios Activos', headerShown: false }} />
            </Stack>
            <GlobalTimerAlert />
        </>
    );
}
