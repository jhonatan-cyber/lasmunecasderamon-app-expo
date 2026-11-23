import Ionicons from '@expo/vector-icons/Ionicons';
import { FontFamily } from '@/constants/fonts';
import { Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

interface Props {
    totalServicios: number;
    totalConsumo: number;
    totalCargas: number;
}

export function HistorySummaryCards({ totalServicios, totalConsumo, totalCargas }: Props) {
    const { accentColor, accentUi, accentOnSurface } = useAccentColor();
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <SummaryCard
                icon="bed-outline"
                label="Servicios"
                amount={totalServicios}
                color={accentColor}
            />
            <SummaryCard
                icon="cart-outline"
                label="Consumo"
                amount={totalConsumo}
                color={accentUi}
            />
            <SummaryCard
                icon="arrow-up-circle-outline"
                label="Cargado"
                amount={totalCargas}
                color={accentOnSurface}
            />
        </View>
    );
}

function SummaryCard({
    icon,
    label,
    amount,
    color,
}: {
    icon: string;
    label: string;
    amount: number;
    color: string;
}) {
    return (
        <View style={{
            flex: 1, padding: 12, borderRadius: 16,
            backgroundColor: `${color}14`,
            borderWidth: 1,
            borderColor: `${color}26`,
        }}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={color} />
            <Text style={{ fontSize: 7, fontFamily: FontFamily.black, color, letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' }}>
                {label}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: FontFamily.black, color, marginTop: 2 }}>
                ${amount.toLocaleString('es-CL')}
            </Text>
        </View>
    );
}
