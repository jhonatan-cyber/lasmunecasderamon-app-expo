import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Appearance, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useAccentColor } from '../hooks/useAccentColor';

interface PremiumHeaderActionsProps {
    hasNewAlert?: boolean;
    notificationCount?: number;
    setHasNewAlert?: (val: boolean) => void;
    onNotificationPress?: () => void;
    showAlert: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger', onConfirm?: () => void, showCancel?: boolean) => void;
    profilePath: string;
    showNotifications?: boolean;
    onQRScannerPress?: () => void;
    onPersonalPress?: () => void;
}

export const PremiumHeaderActions = ({
    hasNewAlert,
    notificationCount = 0,
    setHasNewAlert,
    onNotificationPress,
    showAlert,
    profilePath,
    showNotifications = true,
    onQRScannerPress,
    onPersonalPress
}: PremiumHeaderActionsProps) => {
    const { accentColor, isDark } = useAccentColor();
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    const router = useRouter();

    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
    const role = roleName.toLowerCase();
    const isRestrictedRole = role.includes('garzon') || role.includes('anfitriona');

    // Forzar siempre blanco para el header premium
    const iconColor = '#FFFFFF';
    const btnBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)';
    const btnBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)';

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
            {onQRScannerPress && (
                <Pressable
                    onPress={onQRScannerPress}
                    style={[styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }]}
                >
                    <Ionicons name="qr-code" size={20} color={iconColor} />
                </Pressable>
            )}
            {onPersonalPress && (
                <Pressable
                    onPress={onPersonalPress}
                    style={[styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }]}
                >
                    <Ionicons name="people" size={20} color={iconColor} />
                </Pressable>
            )}
            {showNotifications && !isRestrictedRole && (
                <Pressable
                    onPress={() => {
                        if (onNotificationPress) {
                            onNotificationPress();
                            return;
                        }
                        if (setHasNewAlert) setHasNewAlert(false);
                        showAlert('Sin Notificaciones', 'Tu bandeja de entrada está limpia por el momento.', 'info');
                    }}
                    style={[styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }]}
                >
                    <Ionicons name="notifications-outline" size={20} color={iconColor} />
                    {showDot && (
                        <View style={[styles.notificationBadge, { borderColor: isDark ? '#1E1B4B' : '#FFF' }]}>
                            {notificationCount > 0 && <Text style={styles.notificationText}>{notificationCount > 99 ? '+99' : notificationCount}</Text>}
                        </View>
                    )}
                </Pressable>
            )}
            <Pressable
                onPress={() => router.push(profilePath as any)}
                style={[styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }]}
            >
                <Ionicons name="settings-outline" size={20} color={iconColor} />
            </Pressable>
            <Pressable
                onPress={toggleTheme}
                style={[styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }]}
            >
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={iconColor} />
            </Pressable>
            <Pressable
                onPress={handleLogout}
                style={[styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }]}
            >
                <Ionicons name="log-out-outline" size={20} color={iconColor} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
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
        borderColor: '#000', // Movido a inline para soporte de tema
    },
    notificationText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
});
