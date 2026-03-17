import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '../hooks/useAccentColor';
import { AnimatedButton } from './AnimatedButton';
import { getStatusColor, getStatusLabel } from './PremiumUserProfile';

interface HostessStatusPickerProps {
    userStatus: number;
    onStatusChange: (status: number) => void;
}

export const HostessStatusPicker = ({ userStatus, onStatusChange }: HostessStatusPickerProps) => {
    const { isDark, cardBg, borderColor } = useAccentColor();
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <View style={styles.statusControlGrid}>
            {[1, 2, 3].map(s => (
                <AnimatedButton
                    key={s}
                    style={[
                        styles.statusBtn,
                        { backgroundColor: cardBg, borderColor: userStatus === s ? getStatusColor(s, isDark) : borderColor },
                        userStatus === s && { borderWidth: 2 }
                    ]}
                    onPress={() => onStatusChange(s)}
                    accessibilityLabel={`Cambiar estado a ${getStatusLabel(s)}`}
                    accessibilityRole="button"
                >
                    <Text style={[styles.statusBtnText, { color: userStatus === s ? getStatusColor(s, isDark) : textSecondary }]}>
                        {getStatusLabel(s)}
                    </Text>
                </AnimatedButton>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    statusControlGrid: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 10
    },
    statusBtn: {
        flex: 1,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    statusBtnText: {
        fontSize: 13,
        fontWeight: '700'
    },
});
