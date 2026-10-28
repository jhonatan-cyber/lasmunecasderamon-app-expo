import { Redirect, Stack, useSegments } from 'expo-router';
import React from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { rutaRequiereCajaAbierta } from '@/utils/cajaGate';

export default function GarzonLayout() {
    const { isDark } = useAccentColor();
    const { bloqueado } = useCajaAbierta();
    const segmentos = useSegments();

    // Sin caja abierta, pedidos, productos, servicios y entradas no se abren ni
    // escribiendo la ruta a mano: la tarjeta del inicio ya está bloqueada, pero
    // un deep link se la salta.
    if (bloqueado && rutaRequiereCajaAbierta(segmentos)) {
        return <Redirect href="/(app)/garzon/(tabs)" />;
    }

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerTitleStyle: { fontWeight: '700' },
        }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pedidos" options={{ headerShown: false }} />
            <Stack.Screen name="pendientes" options={{ headerShown: false }} />
            <Stack.Screen name="productos" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
            <Stack.Screen name="servicios" options={{ headerShown: false }} />
            <Stack.Screen name="entradas" options={{ headerShown: false }} />
        </Stack>
    );
}

