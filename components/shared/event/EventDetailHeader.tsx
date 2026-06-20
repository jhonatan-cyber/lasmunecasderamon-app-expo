import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
    iconName: string;
    iconColor: string;
    eventLabel: string;
    amount: number;
    isAnticipo: boolean;
    formatAmount: (v: any) => string;
    textPrimary: string;
    textSecondary: string;
    onClose: () => void;
}

export function EventDetailHeader({ iconName, iconColor, eventLabel, amount, isAnticipo, formatAmount, textPrimary, textSecondary, onClose }: Props) {
    return (
        <>
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
                    <Ionicons name={iconName as any} size={32} color={iconColor} />
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={textPrimary} />
                </Pressable>
            </View>
            <View style={styles.body}>
                <Text style={[styles.type, { color: textSecondary }]}>{eventLabel?.toUpperCase()}</Text>
                <Text style={[styles.amount, { color: iconColor }]}>
                    {isAnticipo ? '-' : '+'}${formatAmount(amount)}
                </Text>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    iconBox: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    closeBtn: { width: 40, height: 40, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
    body: { alignItems: 'center' as const, paddingBottom: 8 },
    type: { fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
    amount: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
});
