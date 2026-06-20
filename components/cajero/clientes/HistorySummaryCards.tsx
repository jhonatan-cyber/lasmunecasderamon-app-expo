import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface Props {
    totalServicios: number;
    totalConsumo: number;
    totalCargas: number;
    isDark: boolean;
}

export function HistorySummaryCards({ totalServicios, totalConsumo, totalCargas, isDark }: Props) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <SummaryCard
                icon="bed-outline"
                label="Servicios"
                amount={totalServicios}
                color="#3B82F6"
                isDark={isDark}
            />
            <SummaryCard
                icon="cart-outline"
                label="Consumo"
                amount={totalConsumo}
                color="#F59E0B"
                isDark={isDark}
            />
            <SummaryCard
                icon="arrow-up-circle-outline"
                label="Cargado"
                amount={totalCargas}
                color="#10B981"
                isDark={isDark}
            />
        </View>
    );
}

function SummaryCard({
    icon,
    label,
    amount,
    color,
    isDark,
}: {
    icon: string;
    label: string;
    amount: number;
    color: string;
    isDark: boolean;
}) {
    return (
        <View style={{
            flex: 1, padding: 12, borderRadius: 16,
            backgroundColor: isDark ? `${color}14` : `${color}0F`,
            borderWidth: 1,
            borderColor: isDark ? `${color}26` : `${color}1A`,
        }}>
            <Ionicons name={icon as any} size={16} color={color} />
            <Text style={{ fontSize: 7, fontWeight: '900', color, letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' }}>
                {label}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color, marginTop: 2 }}>
                ${amount.toLocaleString('es-CL')}
            </Text>
        </View>
    );
}
