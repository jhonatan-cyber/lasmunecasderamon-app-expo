import React from 'react';
import { 
    Modal, 
    Pressable, 
    StyleSheet, 
    View 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { User } from '@/hooks/usePersonalScreen';
import { PersonalQRUserView } from './PersonalQRUserView';
import { PersonalQRNoCodeView } from './PersonalQRNoCodeView';

interface PersonalQRModalProps {
    visible: boolean;
    selectedUser: User | null;
    onClose: () => void;
    isGenerating: boolean;
    handleGenerateQR: (userId: string) => void;
    codigoAsistencia: string;
    accentColor: string;
    accentBg: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
}

export function PersonalQRModal({
    visible,
    selectedUser,
    onClose,
    isGenerating,
    handleGenerateQR,
    codigoAsistencia,
    accentColor,
    accentBg,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
}: PersonalQRModalProps) {
    if (!selectedUser) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.modalDismiss} onPress={onClose} />
                <AnimatedView 
                    from={{ opacity: 0, scale: 0.9, translateY: 50 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    style={[styles.modalContent, { backgroundColor: cardBg }]}
                >
                    <Pressable style={styles.closeBtnAbsolute} onPress={onClose}>
                        <Ionicons name="close" size={24} color={textPrimary} />
                    </Pressable>

                    {selectedUser.qr_token ? (
                        <PersonalQRUserView
                            user={selectedUser}
                            accentColor={accentColor}
                            accentBg={accentBg}
                            borderColor={borderColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            codigoAsistencia={codigoAsistencia}
                            isGenerating={isGenerating}
                            onGenerateQR={handleGenerateQR}
                        />
                    ) : (
                        <PersonalQRNoCodeView
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            isGenerating={isGenerating}
                            onGenerate={() => handleGenerateQR(selectedUser.id)}
                        />
                    )}
                </AnimatedView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
    },
    modalDismiss: {
        ...StyleSheet.absoluteFill,
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
});
