import { Stack } from 'expo-router';
import React from 'react';
import { useAccentColor } from '../../../hooks/useAccentColor';

export default function GarzonLayout() {
    const { isDark } = useAccentColor();

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
            headerTintColor: isDark ? '#FFFFFF' : '#000000',
            headerTitleStyle: { fontWeight: '700' },
        }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pedidos" options={{ headerShown: false }} />
            <Stack.Screen name="productos" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
            <Stack.Screen name="servicios" options={{ headerShown: false }} />
        </Stack>
    );
}
