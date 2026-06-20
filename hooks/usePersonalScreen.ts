import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAccentColor } from '@/hooks/useAccentColor';
import { usersService, codigoService } from '@/services';
import logger from '@/utils/logger';

export interface User {
    id: string;
    name: string;
    lastName: string;
    nick: string;
    role: string;
    foto?: string;
    status: number;
    qr_token?: string;
}

export function usePersonalScreen() {
    const theme = useAccentColor();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
    const dataRef = useRef<string>('');

    const bg = theme.isDark ? '#000000' : '#F3F4F6';
    const cardBg = theme.isDark ? '#111111' : '#FFFFFF';
    const textPrimary = theme.isDark ? '#FFFFFF' : '#111827';
    const textSecondary = theme.isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = theme.isDark ? `${theme.accentColor}40` : 'rgba(0,0,0,0.05)';

    const fetchUsers = useCallback(async (isManual = false) => {
        try {
            logger.info('[PersonalScreen] Fetching users with status=active...');
            const data = await usersService.list('status=active');
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
                    const res = await codigoService.actual();
                    if (res.success) setCodigoAsistencia(res.codigo);
                } catch (e) {
                    logger.captureException(e, { context: 'Personal:onRefresh' });
                }
            })()
        ]);
    };

    const handleGenerateQR = useCallback(async (userId: string) => {
        try {
            setIsGenerating(true);
            const data = await usersService.generateQR({ userId });

            if (data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'Token QR generado correctamente',
                });
                
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

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.nick?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    
    useEffect(() => {
        if (!selectedUser) return;
        
        const fetchUserData = async () => {
            try {
                const data = await usersService.getById(selectedUser.id);
                if (data.success && data.user) {
                    if (data.user.qr_token !== selectedUser.qr_token) {
                        setSelectedUser(data.user);
                        setUsers(prev => prev.map(u => u.id === data.user.id ? data.user : u));
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
        const fetchCode = async () => {
            try {
                const res = await codigoService.actual();
                if (res.success) setCodigoAsistencia(res.codigo);
            } catch {}
        };
        fetchCode();
        const sub = DeviceEventEmitter.addListener('sse_event', (payload: any) => {
            if (payload.type === 'code_changed' && payload.data?.codigo) {
                setCodigoAsistencia(payload.data.codigo);
            }
        });

        return () => {
            sub.remove();
        };
    }, [selectedUser]);

    return {
        ...theme,
        users,
        loading,
        refreshing,
        searchTerm,
        setSearchTerm,
        selectedUser,
        setSelectedUser,
        isGenerating,
        codigoAsistencia,
        bg,
        cardBg,
        textPrimary,
        textSecondary,
        borderColor,
        fetchUsers,
        onRefresh,
        handleGenerateQR,
        filteredUsers,
    };
}
