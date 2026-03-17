import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const AttendanceCodeDisplay = () => {
    const [codigo, setCodigo] = useState<string>('');
    const user = useAuthStore(state => state.user);

    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
    const role = roleName.toLowerCase();
    
    // Solo mostrar para administradores y cajeros
    const canSeeCode = role.includes('administrador') || role.includes('cajero');

    const fetchCodigo = useCallback(async () => {
        if (!canSeeCode) return;
        try {
            const res = await apiClient('/codigo/actual', {
                headers: {
                    'x-user-role': role
                }
            });
            if (res.success) {
                setCodigo(res.codigo);
            }
        } catch (error) {
            console.error('Error fetching attendance code:', error);
        }
    }, [canSeeCode, role]);

    useEffect(() => {
        fetchCodigo();
        
        const interval = setInterval(() => {
            fetchCodigo();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchCodigo]);

    if (!canSeeCode) return null;

    return (
        <View style={styles.badge}>
            <Text style={styles.code}>{codigo || '****'}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#60A5FA',
    },
    code: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    }
});
