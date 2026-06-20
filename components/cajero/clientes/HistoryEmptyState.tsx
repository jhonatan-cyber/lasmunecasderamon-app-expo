import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface Props {
    isDark: boolean;
    textSecondary: string;
}

export function HistoryEmptyState({ isDark, textSecondary }: Props) {
    return (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
            <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: isDark ? 'rgba(155,155,155,0.05)' : 'rgba(155,155,155,0.08)',
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Ionicons name="receipt-outline" size={36} color={isDark ? "#374151" : "#D1D5DB"} />
            </View>
            <Text style={{ color: textSecondary, marginTop: 14, fontSize: 15, fontWeight: '700' }}>
                Sin movimientos
            </Text>
            <Text style={{ color: textSecondary, marginTop: 4, fontSize: 12, opacity: 0.7 }}>
                Aún no hay actividad registrada
            </Text>
        </View>
    );
}
