import { Redirect, Stack, useSegments } from 'expo-router';
import React from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { rutaRequiereCajaAbierta } from '@/utils/cajaGate';

export default function AnfitrionaLayout() {
    const { isDark } = useAccentColor();
    const { bloqueado } = useCajaAbierta();
    const segmentos = useSegments();

    // Sin caja abierta, las rutas que requieren caja redirigen al inicio.
    if (bloqueado && rutaRequiereCajaAbierta(segmentos)) {
        return <Redirect href="/(app)/anfitriona/(tabs)" />;
    }

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerTitleStyle: { fontWeight: '700' },
        }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
            <Stack.Screen name="resumen" options={{ headerShown: false }} />
            <Stack.Screen name="analytics" options={{ headerShown: false }} />
        </Stack>
    );
}
