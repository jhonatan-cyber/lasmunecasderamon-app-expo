﻿import { Ionicons } from '@expo/vector-icons';
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
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
import { apiClient, BASE_URL } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';

const FlashList = ShopifyFlashList as any;

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (width - (GRID_PADDING * 2) - GRID_GAP) / NUM_COLUMNS;

interface User {
    id: string;
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
    const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
    const dataRef = useRef<string>('');

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    const fetchUsers = useCallback(async (isManual = false) => {
        try {
            console.log('[PersonalScreen] Fetching users with status=active...');
            const data = await apiClient('/users?status=active');
            console.log('[PersonalScreen] Response:', data);
            
            if (data.success) {
                // Filtrar personal activo (excluir administrador)
                const allUsers = data.data || [];
                const staff = allUsers.filter((u: User) => {
                    const r = u.role?.toLowerCase() || '';
                    // Excluir administrador
                    if (r.includes('administrador') || r.includes('admin')) return false;
                    // Incluir garzón, mesero, cajero y anfitriona
                    return r.includes('garzon') || 
                           r.includes('garzón') || 
                           r.includes('mesero') ||
                           r.includes('cajero') ||
                           r.includes('anfitriona');
                });
                
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
            console.error('[PersonalScreen] Error fetching users:', error);
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

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchUsers(true),
            (async () => {
                try {
                    const res = await apiClient('/codigo/actual');
                    if (res.success) setCodigoAsistencia(res.codigo);
                } catch (e) {
                    console.error('[Personal] Error refreshing attendance code:', e);
                }
            })()
        ]);
    };

    const handleGenerateQR = useCallback(async (userId: string) => {
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
    }, [selectedUser]);

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nick?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (!selectedUser) return;
        
        const fetchUserData = async () => {
            try {
                const data = await apiClient(`/users/${selectedUser.id}`);
                if (data.success && data.user) {
                    // Si el QR cambió (ya fue usado), actualizar y cerrar el modal
                    if (data.user.qr_token !== selectedUser.qr_token) {
                        setSelectedUser(data.user);
                        setUsers(prev => prev.map(u => u.id === data.user.id ? data.user : u));
                        // Cerrar el modal porque el QR ya fue usado
                        setSelectedUser(null);
                        Toast.show({
                            type: 'info',
                            text1: 'ðŸ“± Código QR usado',
                            text2: 'El usuario ya registró su asistencia'
                        });
                    }
                }
            } catch (e) {
                console.error('Error polling user QR:', e);
            }
        };

        fetchUserData();

        const interval = setInterval(fetchUserData, 5000); // Polling cada 5 segundos
        return () => clearInterval(interval);
    }, [selectedUser, selectedUser?.id]);

    useEffect(() => {
        if (!selectedUser) return;
        const fetch = async () => {
            try {
                const res = await apiClient('/codigo/actual');
                if (res.success) setCodigoAsistencia(res.codigo);
            } catch {}
        };
        fetch();
        const sub = DeviceEventEmitter.addListener('sse_event', (payload: any) => {
            if (payload.type === 'code_changed' && payload.data?.codigo) {
                setCodigoAsistencia(payload.data.codigo);
            }
        });

        return () => {
            sub.remove();
        };
    }, [selectedUser]);


    const renderUser = useCallback(({ item, index }: { item: User; index: number }) => {
        const photoUrl = item.foto ? `${BASE_URL}/img/users/${item.foto}` : null;
        const hasQR = !!item.qr_token;

        return (
            <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 40 }}
                style={[styles.cardContainer, { width: CARD_WIDTH }]}
            >
                <Pressable 
                    onPress={() => setSelectedUser(item)}
                    style={({ pressed }) => [
                        styles.card, 
                        { backgroundColor: cardBg, borderColor },
                        pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }
                    ]}
                >
                    {/* Header con gradiente */}
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
                            {/* Indicador de estado QR */}
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
                        
                        {/* Badge de estado QR */}
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
            </MotiView>
        );
    }, [cardBg, borderColor, accentBg, accentColor, textPrimary, textSecondary, setSelectedUser]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bg }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <PremiumHeader 
                    title="Personal" 
                    subtitle="Lista de trabajadores"
                    rightComponent={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <Pressable onPress={() => fetchUsers(true)} style={styles.backBtnRight}>
                                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                            </Pressable>
                            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                                <Text style={styles.backTextHeader}>Atrás</Text>
                            </Pressable>
                        </View>
                    }
                />
                <View style={styles.skeletonGrid}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <SkeletonLoader 
                            key={i} 
                            width={CARD_WIDTH - 8} 
                            height={160} 
                            borderRadius={20} 
                            style={{ margin: 4 }} 
                        />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <PremiumHeader 
                title="Personal" 
                subtitle="Selecciona un usuario para ver su QR"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <Pressable onPress={() => fetchUsers(true)} style={styles.backBtnRight}>
                            <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        </Pressable>
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextHeader}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

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
                estimatedItemSize={180}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.listContentGrid}
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
                                        <QRCode
                                            value={selectedUser.qr_token || ''}
                                            size={width - 48}
                                            backgroundColor="white"
                                            color={accentColor}
                                            ecl="H"
                                            logo={selectedUser.foto ? { uri: `${BASE_URL}/img/users/${selectedUser.foto}` } : undefined}
                                            logoSize={50}
                                            logoBorderRadius={25}
                                            logoBackgroundColor="white"
                                            logoMargin={4}
                                        />
                                        
                                        <View style={styles.qrFooter}>
                                            <Ionicons name="shield-checkmark" size={14} color={accentColor} />
                                            <Text style={[styles.qrHint, { color: textSecondary, marginTop: 0 }]}>
                                                Token de seguridad personal único
                                            </Text>
                                        </View>

                                        {codigoAsistencia ? (
                                            <View style={[styles.codigoBadge, { borderColor: accentColor }]}>
                                                <Text style={[styles.codigoLabel, { color: textSecondary }]}>Código: </Text>
                                                <Text style={[styles.codigoValue, { color: accentColor }]}>{codigoAsistencia}</Text>
                                            </View>
                                        ) : null}
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
    skeletonGrid: { 
        padding: 12, 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between' 
    },
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
    listContentGrid: {
        paddingHorizontal: GRID_PADDING,
        paddingBottom: 100,
    },
    cardContainer: {
        padding: GRID_GAP / 2,
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
    roleLabel: {
        position: 'absolute',
        bottom: -4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        transform: [{ scale: 0.8 }],
    },
    roleLabelText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
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
    qrButtonMini: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
        gap: 6,
    },
    qrButtonMiniText: {
        fontSize: 10,
        fontWeight: '900',
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
        padding: 0,
    },
    modalDismiss: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '100%',
        maxWidth: '100%',
        borderRadius: 0,
        overflow: 'hidden',
    },
    closeBtnAbsolute: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 9999,
        backgroundColor: 'rgba(150,150,150,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalBody: {},
    modalUserHeader: {
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    modalAvatarLargeWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        padding: 3,
        marginBottom: 8,
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
        paddingVertical: 12,
        paddingHorizontal: 20,
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
        borderRadius: 9999,
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
        borderRadius: 9999,
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
    codigoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    codigoLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    codigoValue: {
        fontSize: 28,
        fontWeight: '900',
        fontFamily: 'monospace',
        letterSpacing: 4,
    },
    backBtnRight: {
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 38, 
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { 
        color: '#FFFFFF', 
        fontWeight: '800', 
        fontSize: 13, 
        letterSpacing: 0.5 
    },
});
