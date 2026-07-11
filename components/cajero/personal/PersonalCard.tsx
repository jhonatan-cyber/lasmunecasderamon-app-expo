import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { BASE_URL } from '@/api/client';
import { User } from '@/hooks/usePersonalScreen';
import { useRenderCount } from '@/hooks/useRenderCount';

interface PersonalCardProps {
    item: User;
    index: number;
    cardWidth: number;
    setSelectedUser: (user: User) => void;
    cardBg: string;
    borderColor: string;
    accentColor: string;
    accentBg: string;
    textPrimary: string;
    textSecondary: string;
}

export function PersonalCard({
    item,
    index,
    cardWidth,
    setSelectedUser,
    cardBg,
    borderColor,
    accentColor,
    accentBg,
    textPrimary,
    textSecondary,
}: PersonalCardProps) {
    useRenderCount('PersonalCard', { userId: item.id });
    const photoUrl = item.foto ? `${BASE_URL}/img/users/${item.foto}` : null;
    const hasQR = !!item.qr_token;

    return (
        <AnimatedView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 40 }}
            style={[styles.cardContainer, { width: cardWidth }]}
        >
            <Pressable 
                onPress={() => setSelectedUser(item)}
                style={({ pressed }) => [
                    styles.card, 
                    { backgroundColor: cardBg, borderColor },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }
                ]}
            >
                {}
                <View style={[styles.cardHeader, { backgroundColor: accentColor }]}>
                    <Text style={styles.cardRoleText} numberOfLines={1}>
                        {item.role?.toUpperCase()}
                    </Text>
                </View>

                <View style={styles.gridContent}>
                    <View style={styles.imageWrapper}>
                        {photoUrl ? (
                            <Image 
                                source={{ uri: photoUrl }} 
                                style={styles.avatarLarge}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholderLarge, { backgroundColor: accentBg }]}>
                                <Text style={[styles.placeholderTextLarge, { color: accentColor }]}>
                                    {item.name?.[0]}{item.lastName?.[0]}
                                </Text>
                            </View>
                        )}
                        {}
                        <View style={[
                            styles.qrStatusIndicator, 
                            { backgroundColor: hasQR ? '#10B981' : '#EF4444' }
                        ]}>
                            <Ionicons name={hasQR ? 'checkmark' : 'close'} size={10} color="white" />
                        </View>
                    </View>
                    
                    <View style={styles.gridInfo}>
                        <Text style={[styles.gridUserName, { color: textPrimary }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.gridUserNick, { color: textSecondary }]} numberOfLines={1}>
                            @{item.nick}
                        </Text>
                    </View>
                    
                    {}
                    <View style={[
                        styles.qrStatusBadge, 
                        { backgroundColor: hasQR ? '#10B98120' : '#EF444420' }
                    ]}>
                        <Ionicons 
                            name={hasQR ? 'qr-code' : 'qr-code-outline'} 
                            size={14} 
                            color={hasQR ? '#10B981' : '#EF4444'} 
                        />
                        <Text style={[
                            styles.qrStatusText, 
                            { color: hasQR ? '#10B981' : '#EF4444' }
                        ]}>
                            {hasQR ? 'QR Activo' : 'Sin QR'}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </AnimatedView>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        padding: 6,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardHeader: {
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardRoleText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    gridContent: {
        alignItems: 'center',
        padding: 12,
        paddingTop: 16,
    },
    imageWrapper: {
        width: 80,
        height: 80,
        position: 'relative',
        marginBottom: 12,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarPlaceholderLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderTextLarge: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    gridInfo: {
        alignItems: 'center',
        marginBottom: 12,
    },
    gridUserName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    gridUserNick: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.7,
    },
    qrStatusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    qrStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        marginTop: 8,
    },
    qrStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
