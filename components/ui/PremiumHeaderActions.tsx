import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useAppearanceStore } from '@/store/appearanceStore';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { isAdminRole, isCajeroRole } from '@/utils/userRole';
import { BiometricEnrollmentModal } from '@/components/shared/BiometricEnrollmentModal';
import { IconButton } from '@/components/ui/IconButton';

interface PremiumHeaderActionsProps {
    hasNewAlert?: boolean;
    notificationCount?: number;
    setHasNewAlert?: (val: boolean) => void;
    onNotificationPress?: () => void;
    showAlert: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger', onConfirm?: () => void, showCancel?: boolean) => void;
    profilePath: string;
    showNotifications?: boolean;
    onQRScannerPress?: () => void;
    /**
     * Deja solo el botón de cambio de tema (claro/oscuro) en el topbar.
     * Se usa en las pantallas de asistencia, anticipos, propinas y horas extras.
     */
    onlyTheme?: boolean;
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
    onlyTheme = false,
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
    // 40 visuales + hitSlop = 44 efectivos: seis botones de 44 no entran en un
    // móvil de 320 px sin desbordar el header.
    const buttonSize = isTablet ? 46 : 40;

    const themeButton = (
        <IconButton
            icon={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            accessibilityLabel="Cambiar tema"
            onPress={toggleScheme}
            color={iconColor}
            size={buttonSize}
            iconSize={20}
            backgroundColor={btnBg}
            borderColor={btnBorder}
            borderWidth={1}
        />
    );

    if (onlyTheme) {
        return (
            <View style={[styles.headerTop, compact && { marginBottom: 10 }, { gap: isTablet ? 12 : 8 }]}>
                {themeButton}
            </View>
        );
    }

    return (
        <View style={[styles.headerTop, compact && { marginBottom: 10 }, { gap: isTablet ? 12 : 8 }]}>
            {onQRScannerPress && !canUseCajeroActions && !isAdmin && (
                <IconButton
                    icon="qr-code"
                    accessibilityLabel="Registrar asistencia con código QR"
                    onPress={onQRScannerPress}
                    color={iconColor}
                    size={buttonSize}
                    iconSize={20}
                    backgroundColor={btnBg}
                    borderColor={btnBorder}
                    borderWidth={1}
                />
            )}
            {showNotifications && !isAdmin && (
                <IconButton
                    icon="notifications-outline"
                    accessibilityLabel={
                        notificationCount > 0
                            ? `Notificaciones, ${notificationCount} sin leer`
                            : 'Notificaciones'
                    }
                    onPress={() => {
                        if (onNotificationPress) {
                            onNotificationPress();
                            return;
                        }
                        if (setHasNewAlert) setHasNewAlert(false);
                        showAlert('Sin Notificaciones', 'Tu bandeja de entrada está limpia por el momento.', 'info');
                    }}
                    color={iconColor}
                    size={buttonSize}
                    iconSize={20}
                    backgroundColor={btnBg}
                    borderColor={btnBorder}
                    borderWidth={1}
                    badge={
                        showDot ? (
                            <View style={styles.notificationBadge}>
                                {notificationCount > 0 && <Text style={styles.notificationText}>{notificationCount > 99 ? '+99' : notificationCount}</Text>}
                            </View>
                        ) : null
                    }
                />
            )}
            {!isBiometricEnrolled && !isAdmin && (
                <IconButton
                    icon="finger-print"
                    accessibilityLabel="Activar acceso biométrico"
                    onPress={() => setShowEnrollment(true)}
                    color={iconColor}
                    size={buttonSize}
                    iconSize={20}
                    backgroundColor={btnBg}
                    borderColor={btnBorder}
                    borderWidth={1}
                />
            )}
            <IconButton
                icon="person-outline"
                accessibilityLabel="Mi perfil y ajustes"
                onPress={() => router.push(profilePath as Href)}
                color={iconColor}
                size={buttonSize}
                iconSize={20}
                backgroundColor={btnBg}
                borderColor={btnBorder}
                borderWidth={1}
            />
            {themeButton}
            <IconButton
                icon="log-out-outline"
                accessibilityLabel="Cerrar sesión"
                onPress={handleLogout}
                color={iconColor}
                size={buttonSize}
                iconSize={20}
                backgroundColor={btnBg}
                borderColor={btnBorder}
                borderWidth={1}
            />
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
