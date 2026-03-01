import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Appearance, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

interface PremiumHeaderActionsProps {
    hasNewAlert?: boolean;
    notificationCount?: number;
    setHasNewAlert?: (val: boolean) => void;
    onNotificationPress?: () => void;
    showAlert: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger', onConfirm?: () => void, showCancel?: boolean) => void;
    profilePath: string;
    showNotifications?: boolean;
}

export const PremiumHeaderActions = ({
    hasNewAlert,
    notificationCount = 0,
    setHasNewAlert,
    onNotificationPress,
    showAlert,
    profilePath,
    showNotifications = true
}: PremiumHeaderActionsProps) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const logout = useAuthStore(state => state.logout);
    const router = useRouter();

    const textPrimary = isDark ? '#FFFFFF' : '#000000';

    const toggleTheme = () => {
        Appearance.setColorScheme(isDark ? 'light' : 'dark');
    };

    const handleLogout = () => {
        showAlert(
            'Cerrar sesión',
            '¿Estás seguro que deseas salir del sistema?',
            'danger',
            () => {
                logout();
                router.replace('/(auth)/login');
            },
            true
        );
    };

    const showDot = hasNewAlert || notificationCount > 0;

    return (
        <View style={styles.headerTop}>
            {showNotifications && (
                <Pressable
                    onPress={() => {
                        if (onNotificationPress) {
                            onNotificationPress();
                            return;
                        }
                        if (setHasNewAlert) setHasNewAlert(false);
                        showAlert('Sin Notificaciones', 'Tu bandeja de entrada está limpia por el momento.', 'info');
                    }}
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                >
                    <Ionicons name="notifications-outline" size={20} color={textPrimary} />
                    {showDot && (
                        <View style={styles.notificationBadge}>
                            {notificationCount > 0 && <Text style={styles.notificationText}>{notificationCount > 99 ? '+99' : notificationCount}</Text>}
                        </View>
                    )}
                </Pressable>
            )}
            <Pressable
                onPress={() => router.push(profilePath as any)}
                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
                <Ionicons name="settings-outline" size={20} color={textPrimary} />
            </Pressable>
            <Pressable
                onPress={toggleTheme}
                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={textPrimary} />
            </Pressable>
            <Pressable
                onPress={handleLogout}
                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginBottom: 20,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    notificationText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
});
