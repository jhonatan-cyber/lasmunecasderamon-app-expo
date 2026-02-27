import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

interface PremiumAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export const PremiumAlert: React.FC<PremiumAlertProps> = ({
    visible,
    title,
    message,
    type = 'info',
    onConfirm,
    onCancel,
    showCancel = false,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
}) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';

    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const getIcon = () => {
        switch (type) {
            case 'danger': return 'alert-circle';
            case 'success': return 'checkmark-circle';
            case 'warning': return 'warning';
            default: return 'information-circle';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'danger': return '#EF4444';
            case 'success': return '#10B981';
            case 'warning': return '#F59E0B';
            default: return '#8B5CF6';
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.alertCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                    <View style={[styles.alertIconHeader, { backgroundColor: `${getColor()}20` }]}>
                        <Ionicons name={getIcon()} size={40} color={getColor()} />
                    </View>

                    <Text style={[styles.alertTitle, { color: textPrimary }]}>{title}</Text>
                    <Text style={[styles.alertMessage, { color: textSecondary }]}>{message}</Text>

                    <View style={styles.alertActions}>
                        {showCancel && (
                            <Pressable
                                onPress={onCancel}
                                style={[styles.alertBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB', flex: 1 }]}
                            >
                                <Text style={[styles.alertBtnText, { color: textPrimary }]}>{cancelText}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={onConfirm}
                            style={[
                                styles.alertBtn,
                                {
                                    backgroundColor: type === 'danger' ? '#EF4444' : '#8B5CF6',
                                    flex: showCancel ? 1 : 0,
                                    minWidth: showCancel ? 0 : 120
                                }
                            ]}
                        >
                            <Text style={[styles.alertBtnText, { color: '#FFF' }]}>{confirmText}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertCard: {
        width: '90%',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    alertIconHeader: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
    },
    alertMessage: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    alertBtn: {
        flex: 1,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    alertBtnText: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
});
