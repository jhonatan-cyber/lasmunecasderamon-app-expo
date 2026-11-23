import React, { useMemo, useState } from 'react';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '@/api/client';
import { AttendanceCodeDisplay } from '@/components/anfitriona/AttendanceCodeDisplay';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { getUserRole, isAdminRole } from '@/utils/userRole';

interface PremiumUserProfileProps {
    user: any;
    userStatus: number;
    role?: 'anfitriona' | 'garzon' | 'cajero' | string;
    /** Colores del contenido sobre el degradado del acento. */
    gradientText?: string;
    gradientTextMuted?: string;
    controlBg?: string;
}

export const getStatusColor = (status: number, accentOnSurface: string, accentColor: string, accentUi: string, textSecondary: string) => {
    switch (status) {
        case 1: return accentOnSurface;
        case 2: return accentColor;
        case 3: return accentUi;
        default: return textSecondary;
    }
};

export const getStatusLabel = (status: number) => {
    switch (status) {
        case 1: return 'Disponible';
        case 2: return 'En Servicio';
        case 3: return 'En Descanso';
        default: return 'Desconectado';
    }
};

const getRoleLabel = (role?: string) => {
    switch (role) {
        case 'anfitriona':
            return 'Anfitriona';
        case 'garzon':
            return 'Garzón';
        case 'cajero':
            return 'Cajero';
        default:
            return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
    }
};

export const PremiumUserProfile = ({
    user,
    userStatus,
    role,
    gradientText = 'rgba(255,255,255,0.95)',
    gradientTextMuted = 'rgba(255,255,255,0.7)',
    controlBg = 'rgba(255,255,255,0.12)',
}: PremiumUserProfileProps) => {
    const { isTablet, isLandscape } = useResponsiveMetrics();
    const compact = isLandscape && !isTablet;
    // El estado de la imagen se reinicia cuando cambia la foto sin un efecto:
    // así el primer render ya usa el estado correcto y no hay renders extra.
    const fotoKey = user?.foto ?? '';
    const [imageState, setImageState] = useState({
        foto: fotoKey,
        error: false,
        loading: true,
    });
    if (imageState.foto !== fotoKey) {
        setImageState({ foto: fotoKey, error: false, loading: true });
    }
    const imageError = imageState.error;
    const imageLoading = imageState.loading;

    const avatarUri = useMemo(() => {
        if (imageError) {
            return `${BASE_URL}/api/images/users/default.png`;
        }

        if (user?.foto) {
            return user.foto.startsWith('http') ? user.foto : `${BASE_URL}/api/images/users/${user.foto}`;
        }

        return `${BASE_URL}/api/images/users/default.png`;
    }, [imageError, user?.foto]);

    // El bloque se dibuja sobre el degradado del acento.
    const textPrimary = gradientText;
    const textSecondary = gradientTextMuted;

    const lastName =
        user?.lastName ||
        user?.last_name ||
        user?.apellido ||
        '';

    const fullName = [user?.name, lastName].filter(Boolean).join(' ').trim() || user?.username || 'Usuario';
    const nick = user?.nick || user?.username || fullName;
    const showFullName = Boolean(fullName) && fullName !== nick;
    const esAdmin = isAdminRole(user);
    const roleLabel = getRoleLabel(esAdmin ? getUserRole(user) : role || user?.role);

    return (
        <View style={styles.headerUser}>
            <View style={[styles.avatarContainer, { backgroundColor: controlBg }, compact && styles.avatarContainerCompact]}>
                <Image
                    source={{ uri: avatarUri }}
                    style={[
                        styles.avatar,
                        compact && { borderRadius: 18 },
                        imageLoading && { opacity: 0 },
                    ]}
                    onError={() =>
                        setImageState((state) => ({
                            ...state,
                            error: true,
                            loading: false,
                        }))
                    }
                    onLoad={() =>
                        setImageState((state) => ({
                            ...state,
                            loading: false,
                        }))
                    }
                />
                {imageLoading && (
                    <View
                        style={[
                            styles.avatarSkeleton,
                            StyleSheet.absoluteFill,
                        ]}
                    >
                        <ActivityIndicator
                            size="small"
                            color="rgba(255,255,255,0.5)"
                        />
                    </View>
                )}
                {userStatus && (
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: getStatusColor(userStatus, gradientText, gradientText, gradientTextMuted, gradientTextMuted), borderColor: controlBg, borderWidth: 2 }
                        ]}
                        accessibilityLabel={`Estado: ${getStatusLabel(userStatus)}`}
                    />
                )}
            </View>
            <View style={styles.headerInfo}>
                <View style={styles.nameHeaderContainer}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.username, styles.usernameText, { color: textPrimary }, compact && { fontSize: 19 }]} numberOfLines={1}>
                        @{nick}
                    </Text>
                    {!esAdmin && role !== 'cajero' && <AttendanceCodeDisplay />}
                </View>
                {showFullName && (
                    <Text style={[styles.nickText, { color: textSecondary }]} numberOfLines={1}>
                        {fullName}
                    </Text>
                )}
                {roleLabel ? (
                    <View style={styles.statusRow}>
                        <Text style={[styles.statusText, { color: textSecondary }]} numberOfLines={1}>
                            {roleLabel}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        position: 'relative',
    },
    avatarContainerCompact: {
        width: 46,
        height: 46,
        borderRadius: BorderRadius.full,
    },
    avatarSkeleton: {
        width: '100%',
        height: '100%',
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: BorderRadius.full,
    },
    headerInfo: {
        flex: 1,
    },
    username: {
        fontSize: 24,
        fontFamily: FontFamily.black,
        letterSpacing: -0.5,
    },
    nameHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        minWidth: 0,
    },
    usernameText: {
        flexShrink: 1,
        paddingRight: 12,
        minWidth: 0,
    },
    nickText: {
        marginTop: 2,
        fontSize: 13,
        fontFamily: FontFamily.bold,
        letterSpacing: 0.2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: BorderRadius.full,
    },
    statusText: {
        fontSize: 13,
        fontFamily: FontFamily.semibold,
    },
});
