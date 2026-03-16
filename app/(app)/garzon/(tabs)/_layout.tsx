import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Alert, Appearance, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumTabBar } from '../../../../components/PremiumTabBar';
import ProfileEditModal from '../../../../components/ProfileEditModal';
import { RegistroAsistenciaModal } from '../../../../components/RegistroAsistenciaModal';
import { useAuthStore } from '../../../../store/authStore';
import { useAccentColor } from '../../../../hooks/useAccentColor';

export default function GarzonTabsLayout() {
    const logout = useAuthStore((state) => state.logout);
    const { accentColor, isDark } = useAccentColor();
    const insets = useSafeAreaInsets();
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);

    const bgColor = isDark ? '#000000' : '#F3F4F6';
    const activeColor = accentColor;
    const inactiveColor = isDark ? '#4B5563' : '#9CA3AF';
    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: logout },
        ]);
    };

    const toggleTheme = () => {
        Appearance.setColorScheme(isDark ? 'light' : 'dark');
    };

    return (
        <View style={{ flex: 1, backgroundColor: bgColor }}>
            <Tabs
                tabBar={(props: any) => <PremiumTabBar {...props} />}
                screenOptions={{
                    headerShown: false
                }}>
                <Tabs.Screen name="asistencia" options={{
                    title: 'Asistencia',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar" size={size} color={color} />
                    ),
                    headerShown: false,
                }} />
                <Tabs.Screen name="anticipos" options={{
                    title: 'Anticipos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="card" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="index" options={{
                    title: 'Inicio',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="propinas" options={{
                    title: 'Propinas',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cash" size={size} color={color} />
                    ),
                }} />
                <Tabs.Screen name="horas-extras" options={{
                    title: 'Horas Extras',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="time" size={size} color={color} />
                    ),
                }} />
            </Tabs>

            <ProfileEditModal
                visible={profileModalVisible}
                onClose={() => setProfileModalVisible(false)}
            />

            <RegistroAsistenciaModal
                visible={showAsistenciaModal}
                onClose={() => setShowAsistenciaModal(false)}
                onRegistered={() => setShowAsistenciaModal(false)}
            />
        </View>
    );
}


