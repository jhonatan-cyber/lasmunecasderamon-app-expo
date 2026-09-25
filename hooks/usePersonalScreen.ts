import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { eventBus } from '@/utils/eventBus';
import { showToast } from '@/utils/toast-lazy';
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
    const { bg, cardBg, textPrimary, textSecondary, borderColor } = theme;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
    const dataRef = useRef<string>('');

    const fetchUsers = useCallback(async (isManual = false, signal?: AbortSignal) => {
        try {
            logger.debug('[PersonalScreen] Fetching users with status=active...');
            const data = await usersService.list('status=active', signal);
            logger.debug('[PersonalScreen] Response:', data);
            
            if ((data as any).success) {
                const allUsers = (data as any).data || [];
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
                    showToast({
                        type: 'success',
                        text1: 'Actualizado',
                        text2: 'Lista de personal al día',
                    });
                }
            }
        } catch (error: any) {
            logger.captureException(error, { context: 'Personal:fetchUsers' });
            showToast({
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
            const ac = new AbortController();
            fetchUsers(false, ac.signal);
            return () => ac.abort();
        }, [fetchUsers])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchUsers(true),
            (async () => {
                try {
                    const res = await codigoService.actual();
                    if ((res as any).success) setCodigoAsistencia((res as any).codigo);
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
            const challenge = (data as any)?.data as { token?: string; ttlSegundos?: number } | undefined;

            if ((data as any).success && challenge?.token) {
                showToast({
                    type: 'success',
                    text1: 'Éxito',
                    text2: `Código QR generado · vence en ${challenge.ttlSegundos ?? 120}s`,
                });
                
                setUsers(prev => prev.map(u => 
                    u.id === userId ? { ...u, qr_token: challenge.token } : u
                ));
                
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => prev ? { ...prev, qr_token: challenge.token } : null);
                }
            }
        } catch (error: any) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo generar el código',
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
        // El servidor ya no almacena qr_token (desde la migración de desafíos):
        // el código es un desafío de un solo uso, así que se emite al abrir el modal.
        if (!selectedUser.qr_token) {
            handleGenerateQR(selectedUser.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser, selectedUser?.id]);

    
    useEffect(() => {
        if (!selectedUser) return;
        const fetchCode = async () => {
            try {
                const res = await codigoService.actual();
                if ((res as any).success) setCodigoAsistencia((res as any).codigo);
            } catch {}
        };
        fetchCode();
        const sub = eventBus.addListener('sse_event', (payload: any) => {
            if (payload.type === 'code_changed' && payload.data?.codigo) {
                setCodigoAsistencia(payload.data.codigo);
            }
            // La asistencia registrada cierra el modal del QR (desafío canjeado)
            if (payload.type === 'attendance_registered' && String(payload.data?.user?.id) === String(selectedUser.id)) {
                setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, qr_token: undefined } : u));
                setSelectedUser(null);
                showToast({
                    type: 'info',
                    text1: '📱 Código QR usado',
                    text2: 'El usuario ya registró su asistencia'
                });
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
        fetchUsers,
        onRefresh,
        handleGenerateQR,
        filteredUsers,
    };
}
