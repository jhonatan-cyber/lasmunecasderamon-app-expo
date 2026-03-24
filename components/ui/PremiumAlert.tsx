import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

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
    const { isDark, cardBg } = useAccentColor();
    const { width } = Dimensions.get('window');
    const isTablet = width >= 768;

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
            default: return '#E11D48';
        }
    };

    const alertWidth = isTablet ? '60%' : '90%';
    const iconSize = isTablet ? 56 : 40;
    const padding = isTablet ? 32 : 24;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel ?? onConfirm}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.alertCard, { backgroundColor: cardBg, width: alertWidth, padding }]}>

                    {/* Botón cerrar ✕ — esquina superior derecha */}
                    <Pressable
                        onPress={onCancel ?? onConfirm}
                        style={[styles.closeBtn, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}
                        accessibilityLabel="Cerrar"
                        accessibilityRole="button"
                    >
                        <Ionicons name="close" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </Pressable>

                    <View style={[styles.alertIconHeader, { backgroundColor: `${getColor()}20`, width: iconSize + 16, height: iconSize + 16, borderRadius: (iconSize + 16) / 2 }]}>
                        <Ionicons name={getIcon()} size={iconSize} color={getColor()} />
                    </View>

                    <Text style={[styles.alertTitle, { color: textPrimary, fontSize: isTablet ? 24 : 20 }]}>{title}</Text>
                    <Text style={[styles.alertMessage, { color: textSecondary, fontSize: isTablet ? 17 : 15 }]}>{message}</Text>

                    <View style={styles.alertActions}>
                        {showCancel && (
                            <Pressable
                                onPress={onCancel}
                                style={[styles.alertBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB', flex: 1, height: isTablet ? 60 : 54 }]}
                            >
                                <Text style={[styles.alertBtnText, { color: textPrimary, fontSize: isTablet ? 16 : 14 }]}>{cancelText}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={onConfirm}
                            style={[
                                styles.alertBtn,
                                {
                                    backgroundColor: getColor(),
                                    flex: showCancel ? 1 : 0,
                                    minWidth: showCancel ? 0 : (isTablet ? 160 : 120),
                                    height: isTablet ? 60 : 54
                                }
                            ]}
                        >
                            <Text style={[styles.alertBtnText, { color: '#FFF', fontSize: isTablet ? 16 : 14 }]}>{confirmText}</Text>
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
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
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
