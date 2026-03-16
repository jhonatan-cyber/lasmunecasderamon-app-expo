import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
const FlashList = ShopifyFlashList as any;
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import { apiClient, BASE_URL } from '../../../api/client';
import { PremiumHeader } from '../../../components/PremiumHeader';
import { SkeletonLoader } from '../../../components/SkeletonLoader';
import { useAccentColor } from '../../../hooks/useAccentColor';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = width - (CARD_MARGIN * 2) - 24;

interface User {
    id: number;
    name: string;
    lastName: string;
    nick: string;
    role: string;
    foto?: string;
    status: number;
    qr_token?: string;
}

export default function PersonalScreen() {
    const router = useRouter();
    const { accentColor, accentBg, isDark } = useAccentColor();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const dataRef = useRef<string>('');

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    const fetchUsers = useCallback(async (isManual = false) => {
        try {
            const data = await apiClient('/users');
            if (data.success) {
                // Filtrar personal activo y no administradores
                const allUsers = data.data || [];
                const staff = allUsers.filter((u: User) => 
                    u.status === 1 && 
                    u.role?.toLowerCase() !== 'administrador' && 
                    u.role?.toLowerCase() !== 'admin'
                );
                
                const serialized = JSON.stringify(staff);
                if (dataRef.current !== serialized) {
                    dataRef.current = serialized;
                    setUsers(staff);
                }

                if (isManual) {
                    Toast.show({
                        type: 'success',
                        text1: 'Actualizado',
                        text2: 'Lista de personal al día',
                    });
                }
            }
        } catch (error: any) {
            console.error('[PersonalScreen] Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo cargar el personal',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [fetchUsers])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(true);
    };

    const handleGenerateQR = useCallback(async (userId: number) => {
        try {
            setIsGenerating(true);
            const data = await apiClient('/users/generate-qr', {
                method: 'POST',
                body: JSON.stringify({ userId })
            });

            if (data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'Token QR generado correctamente',
                });
                
                // Actualizar localmente
                setUsers(prev => prev.map(u => 
                    u.id === userId ? { ...u, qr_token: data.qr_token } : u
                ));
                
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => prev ? { ...prev, qr_token: data.qr_token } : null);
                }
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo generar el token',
            });
        } finally {
            setIsGenerating(false);
        }
    }, [selectedUser?.id]);

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nick?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Polling del usuario seleccionado para actualizar el QR si cambia en el servidor
    useEffect(() => {
        if (!selectedUser) return;
        const interval = setInterval(async () => {
            try {
                const data = await apiClient(`/users/${selectedUser.id}`);
                if (data.success && data.user && data.user.qr_token !== selectedUser.qr_token) {
                    setSelectedUser(data.user);
                    // Actualizar también en la lista principal
                    setUsers(prev => prev.map(u => u.id === data.user.id ? data.user : u));
                }
            } catch (e) {
                console.error('Error polling user QR:', e);
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [selectedUser?.id, selectedUser?.qr_token]);


    const renderUser = useCallback(({ item, index }: { item: User; index: number }) => {
        const photoUrl = item.foto ? `${BASE_URL}/img/users/${item.foto}` : null;

        return (
            <MotiView
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: index * 50 }}
                style={[styles.cardContainer, { width: CARD_WIDTH }]}
            >
                <Pressable 
                    onPress={() => setSelectedUser(item)}
                    style={({ pressed }) => [
                        styles.card, 
                        { backgroundColor: cardBg, borderColor },
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                    ]}
                >
                    <View style={styles.rowContent}>
                        <View style={styles.imageContainer}>
                            {photoUrl ? (
                                <Image 
                                    source={{ uri: photoUrl }} 
                                    style={styles.avatar}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: accentBg }]}>
                                    <Text style={[styles.placeholderText, { color: accentColor }]}>
                                        {item.name?.[0]}{item.lastName?.[0]}
                                    </Text>
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.cardInfo}>
                            <View style={styles.nameRow}>
                                <Text style={[styles.userName, { color: textPrimary }]} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={[styles.userLastName, { color: textPrimary }]} numberOfLines={1}>
                                    {item.lastName}
                                </Text>
                            </View>
                            <Text style={[styles.userNick, { color: textSecondary }]}>
                                @{item.nick}
                            </Text>
                            <View style={styles.roleBadgeRow}>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleText}>{item.role}</Text>
                                </View>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={textSecondary} />
                    </View>
                </Pressable>
            </MotiView>
        );
    }, [cardBg, borderColor, accentBg, accentColor, textPrimary, textSecondary, setSelectedUser]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bg }]}>
                <PremiumHeader title="Personal" subtitle="Lista de trabajadores" onBack={() => router.back()} />
                <View style={styles.skeletonContainer}>
                    {[1, 2, 3, 4].map(i => (
                        <SkeletonLoader key={i} width={CARD_WIDTH} height={84} borderRadius={16} style={{ margin: CARD_MARGIN / 2 }} />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Personal" subtitle="Selecciona un usuario para ver su QR" onBack={() => router.back()} />

            <View style={styles.searchBarContainer}>
                <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
                    <Ionicons name="search" size={20} color={textSecondary} />
                    <TextInput
                        placeholder="Buscar por nombre o nick..."
                        placeholderTextColor={textSecondary}
                        style={[styles.searchInput, { color: textPrimary }]}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm !== '' && (
                        <Pressable onPress={() => setSearchTerm('')}>
                            <Ionicons name="close-circle" size={20} color={textSecondary} />
                        </Pressable>
                    )}
                </View>
            </View>

            <FlashList
                data={filteredUsers}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={renderUser}
                estimatedItemSize={80}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>
                            {searchTerm ? 'No se encontraron resultados' : 'No hay personal registrado'}
                        </Text>
                    </View>
                }
            />

            {/* QR Modal */}
            <Modal
                visible={!!selectedUser}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedUser(null)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalDismiss} onPress={() => setSelectedUser(null)} />
                    <MotiView 
                        from={{ opacity: 0, scale: 0.9, translateY: 50 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={[styles.modalContent, { backgroundColor: cardBg }]}
                    >
                        <Pressable style={styles.closeBtnAbsolute} onPress={() => setSelectedUser(null)}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>

                        <View style={styles.modalBody}>
                            {selectedUser?.qr_token ? (
                                <>
                                    <View style={[styles.modalUserHeader, { borderBottomColor: borderColor }]}>
                                        <View style={[styles.modalAvatarLargeWrapper, { borderColor: accentColor }]}>
                                            {selectedUser.foto ? (
                                                <Image 
                                                    source={{ uri: `${BASE_URL}/img/users/${selectedUser.foto}` }} 
                                                    style={styles.modalAvatarLarge} 
                                                />
                                            ) : (
                                                <View style={[styles.modalAvatarLargePlaceholder, { backgroundColor: accentBg }]}>
                                                    <Text style={[styles.modalAvatarLargeText, { color: accentColor }]}>
                                                        {selectedUser.name?.[0]}{selectedUser.lastName?.[0]}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.modalUserNameLarge, { color: textPrimary }]}>
                                            {selectedUser.name} {selectedUser.lastName}
                                        </Text>
                                        <Text style={[styles.modalUserNickLarge, { color: accentColor }]}>
                                            @{selectedUser.nick}
                                        </Text>
                                        <View style={[styles.modalRoleBadge, { backgroundColor: `${accentColor}20` }]}>
                                            <Text style={[styles.modalRoleText, { color: accentColor }]}>{selectedUser.role}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.qrContainer}>
                                        <View style={[styles.qrGlow, { backgroundColor: accentColor }]} />
                                        <View style={[styles.qrWrapper, { borderColor: accentColor }]}>
                                            <QRCode
                                                value={selectedUser.qr_token || ''}
                                                size={width - 160}
                                                backgroundColor="white"
                                                color={accentColor}
                                                ecl="H"
                                                logo={selectedUser.foto ? { uri: `${BASE_URL}/img/users/${selectedUser.foto}` } : undefined}
                                                logoSize={50}
                                                logoBorderRadius={25}
                                                logoBackgroundColor="white"
                                                logoMargin={4}
                                            />
                                        </View>
                                        
                                        <View style={styles.qrFooter}>
                                            <Ionicons name="shield-checkmark" size={14} color={accentColor} />
                                            <Text style={[styles.qrHint, { color: textSecondary, marginTop: 0 }]}>
                                                Token de seguridad personal único
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalActions}>
                                        <Pressable 
                                            style={[styles.actionBtn, { backgroundColor: `${accentColor}15`, borderColor: accentColor }]}
                                            onPress={() => selectedUser && handleGenerateQR(selectedUser.id)}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? (
                                                <ActivityIndicator color={accentColor} size="small" />
                                            ) : (
                                                <>
                                                    <Ionicons name="refresh" size={20} color={accentColor} />
                                                    <Text style={[styles.actionBtnText, { color: accentColor }]}>Regenerar</Text>
                                                </>
                                            )}
                                        </Pressable>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.noQrContainer}>
                                    <View style={[styles.noQrIconCircle, { backgroundColor: `${accentColor}15` }]}>
                                        <Ionicons name="qr-code-outline" size={56} color={accentColor} />
                                    </View>
                                    <Text style={[styles.noQrTitle, { color: textPrimary }]}>Sin Código QR</Text>
                                    <Text style={[styles.noQrText, { color: textSecondary }]}>
                                        Este usuario no tiene un código de asistencia asignado
                                    </Text>
                                    <Pressable 
                                        style={[styles.generateBtn, { backgroundColor: accentColor }]}
                                        onPress={() => selectedUser && handleGenerateQR(selectedUser.id)}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name="qr-code-outline" size={20} color="white" />
                                                <Text style={styles.generateBtnText}>Generar Código QR</Text>
                                            </>
                                        )}
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </MotiView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    skeletonContainer: { padding: 12 },
    searchBarContainer: { padding: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 100,
    },
    cardContainer: {
        padding: CARD_MARGIN / 2,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    imageContainer: {
        width: 60,
        height: 60,
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    roleBadgeRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    roleBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    qrButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    roleText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 4,
    },
    userLastName: {
        fontSize: 16,
        fontWeight: '600',
    },
    userNick: {
        fontSize: 13,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalDismiss: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 28,
        overflow: 'hidden',
    },
    closeBtnAbsolute: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(150,150,150,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalBody: {},
    modalUserHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    modalAvatarLargeWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        padding: 3,
        marginBottom: 12,
    },
    modalAvatarLarge: {
        width: '100%',
        height: '100%',
        borderRadius: 37,
    },
    modalAvatarLargePlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 37,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAvatarLargeText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalUserNameLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalUserNickLarge: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    modalRoleBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    modalRoleText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    qrContainer: {
        alignItems: 'center',
        padding: 24,
    },
    qrGlow: {
        position: 'absolute',
        top: '50%',
        width: 200,
        height: 200,
        borderRadius: 100,
        opacity: 0.1,
        transform: [{ translateY: -50 }],
    },
    qrWrapper: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    qrHint: {
        marginTop: 20,
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 18,
    },
    modalActions: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    noQrContainer: {
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    noQrIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noQrTitle: {
        fontSize: 22,
        fontWeight: '900',
    },
    noQrText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        height: 54,
        borderRadius: 27,
        gap: 10,
        marginTop: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    generateBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    qrFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 20,
    },
});
