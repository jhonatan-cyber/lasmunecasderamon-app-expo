import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '@/api/client';
import { AttendanceCodeDisplay } from '@/components/anfitriona/AttendanceCodeDisplay';

interface PremiumUserProfileProps {
    user: any;
    userStatus: number;
    role?: 'anfitriona' | 'garzon' | 'cajero' | string;
}

export const getStatusColor = (status: number, isDark: boolean = true) => {
    switch (status) {
        case 1: return '#10B981';
        case 2: return '#EF4444';
        case 3: return '#F59E0B';
        default: return isDark ? '#9CA3AF' : '#6B7280';
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

export const PremiumUserProfile = ({ user, userStatus, role }: PremiumUserProfileProps) => {
    const [imageError, setImageError] = useState(false);
    const textPrimary = '#FFFFFF';
    const textSecondary = 'rgba(255,255,255,0.7)';

    const lastName =
        user?.lastName ||
        user?.last_name ||
        user?.apellido ||
        '';

    const fullName = [user?.name, lastName].filter(Boolean).join(' ').trim() || user?.username || 'Usuario';
    const nick = user?.nick || user?.username || fullName;
    const showFullName = Boolean(fullName) && fullName !== nick;

    const roleLabel = getRoleLabel(role || user?.role);

    const avatarUri = useMemo(() => {
        if (imageError) {
            return `${BASE_URL}/img/users/default.png`;
        }

        if (user?.foto) {
            return user.foto.startsWith('http') ? user.foto : `${BASE_URL}/img/users/${user.foto}`;
        }

        return `${BASE_URL}/img/users/default.png`;
    }, [imageError, user?.foto]);

    return (
        <View style={styles.headerUser}>
            <View style={styles.avatarContainer}>
                <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                    onError={() => setImageError(true)}
                />
            </View>
            <View style={styles.headerInfo}>
                <View style={styles.nameHeaderContainer}>
                    <Text style={[styles.username, styles.usernameText, { color: textPrimary }]} numberOfLines={1}>
                        @{nick}
                    </Text>
                    <AttendanceCodeDisplay />
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
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    headerInfo: {
        flex: 1,
    },
    username: {
        fontSize: 24,
        fontWeight: '900',
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
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
