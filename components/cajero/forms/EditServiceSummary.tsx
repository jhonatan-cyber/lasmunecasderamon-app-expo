import { Text, View } from 'react-native';
import { getIvaPercent } from '@/hooks/utils/cuentaUtils';

interface Props {
    numAnfs: number;
    totalServicio: number;
    totalHabitacion: number;
    iva: number;
    total: number;
    isTarjeta: boolean;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    cardBg: string;
    borderColor: string;
}

export default function EditServiceSummary({
    numAnfs,
    totalServicio,
    totalHabitacion,
    iva,
    total,
    isTarjeta,
    accentColor,
    textPrimary,
    textSecondary,
    cardBg,
    borderColor,
}: Props) {
    if (numAnfs === 0) return null;

    return (
        <View style={{
            padding: 16, borderRadius: 16, borderWidth: 1,
            marginBottom: 20, marginTop: 10,
            backgroundColor: cardBg, borderColor,
        }}>
            <Text style={{
                fontSize: 11, fontWeight: '900', letterSpacing: 1,
                marginBottom: 12, color: textPrimary,
            }}>
                RESUMEN
            </Text>

            <SummaryRow
                label={`Servicio (${numAnfs} anfitriona${numAnfs > 1 ? 's' : ''})`}
                value={`$${totalServicio.toLocaleString('es-CL')}`}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
            />

            <SummaryRow
                label={`Habitación (${numAnfs} anfitriona${numAnfs > 1 ? 's' : ''})`}
                value={`$${totalHabitacion.toLocaleString('es-CL')}`}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
            />

            {isTarjeta && (
                <SummaryRow
                    label={`IVA (${getIvaPercent()}%)`}
                    value={`$${iva.toLocaleString('es-CL')}`}
                    valueColor={accentColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                />
            )}

            <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 12 }} />

            <View style={rowStyle}>
                <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 0.5, color: textPrimary }}>TOTAL</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: accentColor }}>
                    ${total.toLocaleString('es-CL')}
                </Text>
            </View>
        </View>
    );
}

function SummaryRow({
    label,
    value,
    valueColor,
    textPrimary,
    textSecondary,
}: {
    label: string;
    value: string;
    valueColor?: string;
    textPrimary: string;
    textSecondary: string;
}) {
    return (
        <View style={rowStyle}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary }}>{label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: valueColor || textPrimary }}>{value}</Text>
        </View>
    );
}

const rowStyle = {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
};
