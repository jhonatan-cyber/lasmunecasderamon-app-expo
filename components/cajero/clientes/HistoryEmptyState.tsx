import Ionicons from '@expo/vector-icons/Ionicons';
import { FontFamily } from '@/constants/fonts';
import { Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

interface Props {
    textSecondary: string;
}

export function HistoryEmptyState({ textSecondary }: Props) {
    const { surfaceMuted, textSecondary: themeSecondary } = useAccentColor();
    return (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
            <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: surfaceMuted,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Ionicons name="receipt-outline" size={36} color={themeSecondary} />
            </View>
            <Text style={{ color: textSecondary, marginTop: 14, fontSize: 15, fontFamily: FontFamily.bold }}>
                Sin movimientos
            </Text>
        </View>
    );
}
