import { Ionicons } from '@expo/vector-icons';
import FlashList from "@/components/shared/FlashList";
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    DeviceEventEmitter,
    Dimensions,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClientSafe } from '@/api/client-safe';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import logger from '@/utils/logger';
import { User } from '@/hooks/usePersonalScreen';

import {
    PersonalCard,
    PersonalQRModal
} from '@/components/cajero/personal';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (width - (GRID_PADDING * 2) - GRID_GAP) / NUM_COLUMNS;

export default function PersonalScreen() {
    const router = useRouter();
    const { accentColor, accentBg, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
    const dataRef = useRef<string>('');



    const fetchUsers = useCallback(async (isManual = false) => {
        try {
            logger.info('[PersonalScreen] Fetching users with status=active...');
            const data = await apiClientSafe<any[]>('/users?status=active');
            logger.info('[PersonalScreen] Response:', data);
            
            if (data.success) {
                const allUsers = data.data || [];
                const staff = allUsers.filter((u: User) => {
                    const r = u.role?.toLowerCase() || '';
                    if (r.includes('administrador') || r.includes('admin')) return false;
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
            logger.captureException(error, { context: 'Personal:fetchUsers' });
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
                    const res = await apiClientSafe('/codigo/actual');
                    const codigoData = res as unknown as { success: boolean; codigo: string };
                    if (codigoData.success) setCodigoAsistencia(codigoData.codigo);
                } catch (e) {
                    logger.captureException(e, { context: 'Personal:onRefresh' });
                }
            })()
        ]);
    };

    const handleGenerateQR = useCallback(async (userId: string) => {
        try {
            setIsGenerating(true);
            const data = await apiClientSafe('/users/generate-qr', {
                method: 'POST',
                body: JSON.stringify({ userId })
            });
            const qrData = data as unknown as { success: boolean; qr_token: string };

            if (qrData.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'Token QR generado correctamente',
                });
                
                setUsers(prev => prev.map(u => 
                    u.id === userId ? { ...u, qr_token: qrData.qr_token } : u
                ));
                
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => prev ? { ...prev, qr_token: qrData.qr_token } : null);
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
                const data = await apiClientSafe(`/users/${selectedUser.id}`);
                const userData = data as unknown as { success: boolean; user: User };
                if (userData.success && userData.user) {
                    if (userData.user.qr_token !== selectedUser.qr_token) {
                        setSelectedUser(userData.user);
                        setUsers(prev => prev.map(u => u.id === userData.user.id ? userData.user : u));
                        
                        setSelectedUser(null);
                        Toast.show({
                            type: 'info',
                            text1: '📱 Código QR usado',
                            text2: 'El usuario ya registró su asistencia'
                        });
                    }
                }
            } catch (e) {
                logger.captureException(e, { context: 'Personal:updatePersonal' });
            }
        };

        fetchUserData();

        const interval = setInterval(fetchUserData, 5000); 
        return () => clearInterval(interval);
    }, [selectedUser, selectedUser?.id]);

    useEffect(() => {
        if (!selectedUser) return;
        const fetch = async () => {
            try {
                const res = await apiClientSafe('/codigo/actual');
                const codData = res as unknown as { success: boolean; codigo: string };
                if (codData.success) setCodigoAsistencia(codData.codigo);
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

    const renderUser = useCallback(({ item, index }: { item: User; index: number }) => (
        <PersonalCard
            item={item}
            index={index}
            cardWidth={CARD_WIDTH}
            setSelectedUser={setSelectedUser}
            cardBg={cardBg}
            borderColor={borderColor}
            accentColor={accentColor}
            accentBg={accentBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
        />
    ), [cardBg, borderColor, accentBg, accentColor, textPrimary, textSecondary, setSelectedUser]);

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

            <PersonalQRModal
                visible={!!selectedUser}
                selectedUser={selectedUser}
                onClose={() => setSelectedUser(null)}
                isGenerating={isGenerating}
                handleGenerateQR={handleGenerateQR}
                codigoAsistencia={codigoAsistencia}
                accentColor={accentColor}
                accentBg={accentBg}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
            />
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
