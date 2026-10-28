import { Redirect, Stack, useSegments } from 'expo-router';
import React from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { rutaRequiereCajaAbierta } from '@/utils/cajaGate';

export default function BarmanLayout() {
    const { isDark } = useAccentColor();
    const { bloqueado } = useCajaAbierta();
    const segmentos = useSegments();

    // Mismo bloqueo que el garzón para pedidos, productos, servicios y
    // cortesías. El bar queda accesible: mueve stock y no cobra al cliente.
    if (bloqueado && rutaRequiereCajaAbierta(segmentos)) {
        return <Redirect href="/(app)/barman/(tabs)" />;
    }

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerTitleStyle: { fontWeight: '700' },
        }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="bar" options={{ headerShown: false }} />
            <Stack.Screen name="ventas" options={{ headerShown: false }} />
            <Stack.Screen name="pedidos" options={{ headerShown: false }} />
            <Stack.Screen name="productos" options={{ headerShown: false }} />
            <Stack.Screen name="pendientes" options={{ headerShown: false }} />
            <Stack.Screen name="servicios" options={{ headerShown: false }} />
            <Stack.Screen name="cortesias" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
        </Stack>
    );
}
