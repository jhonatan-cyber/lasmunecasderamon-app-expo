import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useAppearanceStore } from '@/store/appearanceStore';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { isAdminRole, isBarmanRole, isCajeroRole, isGarzonRole, isHostessRole } from '@/utils/userRole';
import { BiometricEnrollmentModal } from '@/components/shared/BiometricEnrollmentModal';

interface PremiumHeaderActionsProps {
    hasNewAlert?: boolean;
    notificationCount?: number;
    setHasNewAlert?: (val: boolean) => void;
    onNotificationPress?: () => void;
    showAlert: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger', onConfirm?: () => void, showCancel?: boolean) => void;
    profilePath: string;
    showNotifications?: boolean;
    onQRScannerPress?: () => void;
}

const HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };

export const PremiumHeaderActions = ({
    hasNewAlert,
    notificationCount = 0,
    setHasNewAlert,
    onNotificationPress,
    showAlert,
    profilePath,
    showNotifications = true,
    onQRScannerPress,
}: PremiumHeaderActionsProps) => {
    const { gradientText, gradientControlBg, gradientControlBorder } = useAccentColor();
    const { isTablet, isLandscape } = useResponsiveMetrics();
    const compact = isLandscape && !isTablet;
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    const { toggleScheme, scheme } = useAppearanceStore();
    const isBiometricEnrolled = useAuthStore((state) => state.biometricoFacialEnrolled);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const router = useRouter();

    const isRestrictedRole = isGarzonRole(user) || isHostessRole(user) || isBarmanRole(user);
    const canUseCajeroActions = isCajeroRole(user);
    const isAdmin = isAdminRole(user);
    // Íconos y botones van sobre el degradado del acento: con el tema negro en
    // modo claro el degradado es blanco, así que el contenido pasa a negro.
    const iconColor = gradientText;
    const btnBg = gradientControlBg;
    const btnBorder = gradientControlBorder;

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
    const iconButtonStyle = [styles.iconButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: 1 }];

    return (
        <View style={[styles.headerTop, compact && { marginBottom: 10 }]}>
            {onQRScannerPress && !canUseCajeroActions && !isAdmin && (
                <Pressable
                    onPress={onQRScannerPress}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Registrar asistencia con código QR"
                    style={iconButtonStyle}
                >
                    <Ionicons name="qr-code" size={20} color={iconColor} />
                </Pressable>
            )}
            {showNotifications && !isAdmin && (
                <Pressable
                    onPress={() => {
                        if (onNotificationPress) {
                            onNotificationPress();
                            return;
                        }
                        if (setHasNewAlert) setHasNewAlert(false);
                        showAlert('Sin Notificaciones', 'Tu bandeja de entrada está limpia por el momento.', 'info');
                    }}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={
                        notificationCount > 0
                            ? `Notificaciones, ${notificationCount} sin leer`
                            : 'Notificaciones'
                    }
                    style={iconButtonStyle}
                >
                    <Ionicons name="notifications-outline" size={20} color={iconColor} />
                    {showDot && (
                        <View style={styles.notificationBadge}>
                            {notificationCount > 0 && <Text style={styles.notificationText}>{notificationCount > 99 ? '+99' : notificationCount}</Text>}
                        </View>
                    )}
                </Pressable>
            )}
            {!isBiometricEnrolled && !isAdmin && (
                <Pressable
                    onPress={() => setShowEnrollment(true)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Activar acceso biométrico"
                    style={iconButtonStyle}
                >
                    <Ionicons name="finger-print" size={20} color={iconColor} />
                </Pressable>
            )}
            <Pressable
                onPress={() => router.push(profilePath as Href)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Mi perfil y ajustes"
                style={iconButtonStyle}
            >
                <Ionicons name="settings-outline" size={20} color={iconColor} />
            </Pressable>
            <Pressable
                onPress={toggleScheme}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Cambiar tema"
                style={iconButtonStyle}
            >
                <Ionicons name={scheme === 'dark' ? 'sunny-outline' : scheme === 'light' ? 'moon-outline' : 'moon-outline'} size={20} color={iconColor} />
            </Pressable>
            <Pressable
                onPress={handleLogout}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                style={iconButtonStyle}
            >
                <Ionicons name="log-out-outline" size={20} color={iconColor} />
            </Pressable>
            <BiometricEnrollmentModal
                visible={showEnrollment}
                onClose={() => setShowEnrollment(false)}
                onEnrolled={() => setShowEnrollment(false)}
            />
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
        borderRadius: 9999,
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
        backgroundColor: '#B91C1C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
    },
    notificationText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
});
