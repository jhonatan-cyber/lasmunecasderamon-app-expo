import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Alert, Appearance, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumTabBar } from '../../../../components/PremiumTabBar';
import ProfileEditModal from '../../../../components/ProfileEditModal';
import { useAuthStore } from '../../../../store/authStore';

export default function AnfitrionaTabsLayout() {
    const logout = useAuthStore((state) => state.logout);
    const colorScheme = useColorScheme() ?? 'dark';
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const [profileModalVisible, setProfileModalVisible] = useState(false);

    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: logout },
        ]);
    };

    const toggleTheme = () => {
        Appearance.setColorScheme(isDark ? 'light' : 'dark');
    };

    const bgColor = isDark ? '#000000' : '#F3F4F6';

    return (
        <View style={{ flex: 1, backgroundColor: bgColor }}>
            <Tabs
                tabBar={(props) => <PremiumTabBar {...props} />}
                screenOptions={{
                    headerShown: false
                }}>
                <Tabs.Screen name="servicios" options={{
                    title: 'Servicios',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="comisiones" options={{
                    title: 'Ventas',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="index" options={{
                    title: 'Inicio',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="asistencia" options={{
                    title: 'Asistencia',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="anticipos" options={{
                    title: 'Anticipos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="card" size={size} color={color} />
                    ),
                }} />
            </Tabs>

            <ProfileEditModal
                visible={profileModalVisible}
                onClose={() => setProfileModalVisible(false)}
            />
        </View>
    );
}


