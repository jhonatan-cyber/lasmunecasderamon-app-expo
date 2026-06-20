import { Text, View } from 'react-native';
import { Timer } from '@/context/TimerContext';

interface Props {
    timer: Timer;
    precioHabitacionSinComision: number;
    textPrimary: string;
    textSecondary: string;
}

export default function EditServiceInfoBox({ timer, precioHabitacionSinComision, textPrimary, textSecondary }: Props) {
    return (
        <View style={{
            marginBottom: 20, padding: 15,
            backgroundColor: 'rgba(139, 92, 246, 0.05)',
            borderRadius: 16,
        }}>
            <Text style={[infoLabel, { color: textSecondary }]}>
                Habitación: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{timer.roomName}</Text>
            </Text>
            <Text style={[infoLabel, { color: textSecondary }]}>
                Cliente: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{timer.clienteNombre}</Text>
            </Text>
            <Text style={[infoLabel, { color: textSecondary }]}>
                Anfitrionas actuales: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>{timer.anfitrionas}</Text>
            </Text>
            <Text style={[infoLabel, { color: textSecondary }]}>
                Precio habitación: <Text style={{ color: textPrimary, fontWeight: 'bold' }}>
                    ${(precioHabitacionSinComision || 0).toLocaleString('es-CL')}
                </Text>
                {precioHabitacionSinComision === 0 && (
                    <Text style={{ color: '#EF4444', fontSize: 11 }}> (No encontrado)</Text>
                )}
            </Text>
        </View>
    );
}

const infoLabel = {
    fontSize: 14,
    marginBottom: 4,
};
