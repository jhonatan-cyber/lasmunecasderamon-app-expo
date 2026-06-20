import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { OvertimeRecord } from '@/hooks/useHorasExtrasScreen';

const statusConfig: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'Pagado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    1: { label: 'Por cobrar', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
};

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

interface OvertimeCardProps {
    item: OvertimeRecord;
    index: number;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    onPress: () => void;
}

export function OvertimeCard({
    item,
    index,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    onPress
}: OvertimeCardProps) {
    const status = statusConfig[item.estado] || statusConfig[1];
    const fecha = new Date(item.fecha_crea);

    return (
        <MotiView
            from={{ opacity: 0, translateX: -10 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: index * 30 }}
        >
            <Pressable
                onPress={onPress}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
                <View style={styles.empHeader}>
                    <View style={[styles.avatar, { backgroundColor: accentColor + '20' }]}>
                        <Text style={[styles.avatarText, { color: accentColor }]}>
                            {getInitials(item.usuario)}
                        </Text>
                    </View>
                    <View style={styles.empInfo}>
                        <Text style={[styles.empName, { color: textPrimary }]} numberOfLines={1}>
                            {item.usuario}
                        </Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={11} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textSecondary }]}>
                                {fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.amountRow}>
                    <View style={styles.amountItem}>
                        <Ionicons name="time-outline" size={13} color="#3B82F6" />
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Horas</Text>
                            <Text style={[styles.amountValue, { color: textPrimary }]}>{item.hora.toFixed(1)} hrs</Text>
                        </View>
                    </View>
                    <View style={styles.amountItem}>
                        <Ionicons name="cash-outline" size={13} color="#10B981" />
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto</Text>
                            <Text style={[styles.amountValue, { color: textPrimary }]}>{formatCurrency(item.monto)}</Text>
                        </View>
                    </View>
                    <View style={styles.amountItem}>
                        <Ionicons name="wallet-outline" size={13} color={accentColor} />
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Total</Text>
                            <Text style={[styles.amountValueTotal, { color: accentColor }]}>{formatCurrency(item.total || item.monto)}</Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    card: { 
        borderRadius: 18, 
        borderWidth: 1, 
        padding: 14, 
        marginBottom: 10, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.08, 
        shadowRadius: 10, 
        elevation: 2 
    },
    empHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10, 
        marginBottom: 10 
    },
    avatar: { 
        width: 36, 
        height: 36, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    avatarText: { 
        fontSize: 12, 
        fontWeight: '900' 
    },
    empInfo: { 
        flex: 1 
    },
    empName: { 
        fontSize: 14, 
        fontWeight: '800' 
    },
    dateRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        marginTop: 2 
    },
    dateText: { 
        fontSize: 11, 
        fontWeight: '500' 
    },
    statusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 9999 
    },
    statusDot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3 
    },
    statusText: { 
        fontSize: 10, 
        fontWeight: '800' 
    },
    divider: { 
        height: 1, 
        marginBottom: 10 
    },
    amountRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    amountItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        flex: 1 
    },
    amountLabel: { 
        fontSize: 9, 
        fontWeight: '700', 
        textTransform: 'uppercase', 
        letterSpacing: 0.3 
    },
    amountValue: { 
        fontSize: 13, 
        fontWeight: '700' 
    },
    amountValueTotal: { 
        fontSize: 15, 
        fontWeight: '900' 
    },
});
