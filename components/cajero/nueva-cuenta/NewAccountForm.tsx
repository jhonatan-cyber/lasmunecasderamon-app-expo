import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NewAccountFormProps {
    selectedCliente: any;
    selectedHabitacion: any;
    selectedTime: number;
    totalComision: number;
    onOpenModal: (modal: string) => void;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
    isTablet: boolean;
}

export function NewAccountForm({
    selectedCliente,
    selectedHabitacion,
    selectedTime,
    totalComision,
    onOpenModal,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    isDark,
    isTablet,
}: NewAccountFormProps) {
    const spacing = isTablet ? 24 : 16;
    const borderRadius = isTablet ? 28 : 24;

    const dynamicStyles = {
        section: { 
            padding: spacing, 
            borderRadius: borderRadius, 
            marginBottom: spacing 
        },
        selectorBtn: { 
            padding: isTablet ? 18 : 14, 
            borderRadius: isTablet ? 20 : 16 
        },
    };

    const hasCommission = totalComision > 0;
    const clientName = selectedCliente
        ? ((selectedCliente.nombre || selectedCliente.name || '') + ' ' + (selectedCliente.apellido || selectedCliente.lastName || selectedCliente.last_name || '')).trim() || 'Cliente Seleccionado'
        : 'Seleccionar Cliente';

    return (
        <View style={[styles.section, dynamicStyles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: isTablet ? 16 : 13 }]}>
                2. Datos del Registro
            </Text>

            <Pressable
                style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor }]}
                onPress={() => onOpenModal('client')}
                accessibilityLabel="Seleccionar cliente"
                accessibilityRole="button"
            >
                <Ionicons name="person" size={20} color={accentColor} />
                <View style={styles.selectorContent}>
                    <Text style={[styles.selectorLabel, { color: textSecondary, fontSize: 10 }]}>CLIENTE</Text>
                    <Text style={[styles.selectorText, { color: textPrimary }]}>{clientName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={textSecondary} />
            </Pressable>

            {hasCommission && (
                <Pressable
                    style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor, marginTop: spacing / 2 }]}
                    onPress={() => onOpenModal('room')}
                    accessibilityLabel="Seleccionar habitación"
                    accessibilityRole="button"
                >
                    <Ionicons name="business" size={20} color="#10B981" />
                    <View style={styles.selectorContent}>
                        <Text style={[styles.selectorLabel, { color: textSecondary, fontSize: 10 }]}>HABITACIÓN / ÁREA</Text>
                        <Text style={[styles.selectorText, { color: textPrimary }]}>
                            {selectedHabitacion?.nombre || 'Seleccionar Habitación (Opcional)'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                </Pressable>
            )}

            {}
            {hasCommission && selectedHabitacion && (!selectedHabitacion.comision_anfitriona || Number(selectedHabitacion.comision_anfitriona) === 0) && (
                <Pressable
                    style={[
                        styles.selectorBtn, 
                        dynamicStyles.selectorBtn, 
                        { 
                            borderColor, 
                            marginTop: spacing / 2, 
                            backgroundColor: 'rgba(59, 130, 246, 0.05)' 
                        }
                    ]}
                    onPress={() => onOpenModal('time')}
                >
                    <Ionicons name="time" size={20} color="#3B82F6" />
                    <View style={styles.selectorContent}>
                        <Text style={[styles.selectorLabel, { color: '#3B82F6', fontSize: 10, fontWeight: '700' }]}>
                            DURACIÓN DEL REGISTRO
                        </Text>
                        <Text style={[styles.selectorText, { color: textPrimary }]}>
                            {selectedTime > 0 ? `${selectedTime} minutos` : 'Seleccionar duración'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#3B82F6" />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { 
        borderWidth: 1 
    },
    sectionTitle: { 
        fontWeight: '900', 
        marginBottom: 15, 
        textTransform: 'uppercase', 
        opacity: 0.6 
    },
    selectorBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderWidth: 1, 
        backgroundColor: 'rgba(155,155,155,0.03)' 
    },
    selectorContent: { 
        flex: 1, 
        marginLeft: 10 
    },
    selectorLabel: { 
        fontWeight: '900', 
        marginBottom: 2, 
        letterSpacing: 0.3 
    },
    selectorText: { 
        fontSize: 14, 
        fontWeight: '700' 
    },
});
