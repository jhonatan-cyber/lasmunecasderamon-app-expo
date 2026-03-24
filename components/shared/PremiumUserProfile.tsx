import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '@/api/client';
import { AttendanceCodeDisplay } from '@/components/anfitriona/AttendanceCodeDisplay';

interface PremiumUserProfileProps {
    user: any;
    userStatus: number;
}

export const getStatusColor = (status: number, isDark: boolean = true) => {
    switch (status) {
        case 1: return '#10B981'; // Disponible
        case 2: return '#EF4444'; // Ocupado/a
        case 3: return '#F59E0B'; // Descanso
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

export const PremiumUserProfile = ({ user, userStatus }: PremiumUserProfileProps) => {
    // Forzar siempre blanco para el header premium
    const textPrimary = '#FFFFFF';
    const textSecondary = 'rgba(255,255,255,0.7)';
    const cardBg = 'rgba(255,255,255,0.1)';

    const lastName =
        user?.lastName ||
        user?.last_name ||
        user?.apellido ||
        '';

    const baseName = user?.name || user?.nick || user?.username || 'Usuario';
    const displayName = user?.name ? [user?.name, lastName].filter(Boolean).join(' ') : baseName;
    const nick = user?.nick || user?.username || '';
    const showNick = Boolean(nick) && nick !== user?.name;

    return (
        <View style={styles.headerUser}>
            <View style={[styles.avatarContainer, { borderColor: getStatusColor(userStatus, true) }]}>
                {user?.foto ? (
                    <Image
                        source={{ uri: user.foto.startsWith('http') ? user.foto : `${BASE_URL}/img/users/${user.foto}` }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: cardBg }]}>
                        <Text style={styles.avatarEmoji}>👤</Text>
                    </View>
                )}
            </View>
            <View style={styles.headerInfo}>
                <View style={styles.nameHeaderContainer}>
                    <Text style={[styles.username, styles.usernameText, { color: textPrimary }]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <AttendanceCodeDisplay />
                </View>
                {showNick && (
                    <Text style={[styles.nickText, { color: textSecondary }]} numberOfLines={1}>
                        @{nick}
                    </Text>
                )}
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(userStatus, true) }]} />
                    <Text style={[styles.statusText, { color: textSecondary }]}>
                        {getStatusLabel(userStatus)}
                    </Text>
                </View>
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
        overflow: 'hidden',
        borderWidth: 2,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarEmoji: {
        fontSize: 32,
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
        width: 8, height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
});


