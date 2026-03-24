import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Spacing } from '@/constants';
import { useAccentColor } from '@/hooks/useAccentColor';
import { GarzonActionCard } from '@/components/garzon/GarzonActionCard';
import { StaggeredFadeIn } from '@/components/ui/StaggeredFadeIn';

export const CajeroActionGrid = () => {
    const { accentColor } = useAccentColor();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const cols = isTablet ? 3 : 2;
    const spacing = isTablet ? 24 : 16;
    const actions = [
        { title: "VENTAS", description: "Realizar nueva venta", icon: "cart" as const, color: accentColor, route: '/cajero/ventas' },
        { title: "CUENTAS", description: "Cuentas pendientes", icon: "receipt" as const, color: accentColor, route: '/cajero/cuentas' },
        { title: "SERVICIOS", description: "Gestión de privados", icon: "bed" as const, color: accentColor, route: '/cajero/servicios' },
        { title: "CAJA", description: "Control de cajas", icon: "cash" as const, color: accentColor, route: '/cajero/caja' },
        { title: "PEDIDOS", description: "Solicitudes pendientes", icon: "notifications" as const, color: accentColor, route: '/cajero/solicitudes' },
        { title: "CLIENTES", description: "Gestión de prepago", icon: "person" as const, color: accentColor, route: '/cajero/clientes' },
        { title: "PERSONAL", description: "Liquidación y Asistencia", icon: "people" as const, color: accentColor, route: '/cajero/administrativo' },
    ];

    const rows = [];
    for (let i = 0; i < actions.length; i += cols) {
        rows.push(actions.slice(i, i + cols));
    }

    return (
        <View style={[styles.container, { paddingHorizontal: spacing }]}>
            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={[styles.actionGrid, { marginTop: rowIndex > 0 ? spacing / 2 : 0, gap: spacing / 2 }]}>
                    {row.map((action, colIndex) => (
                        <StaggeredFadeIn key={action.title} index={rowIndex * cols + colIndex} style={{ flex: 1 }}>
                            <GarzonActionCard
                                title={action.title}
                                description={action.description}
                                icon={action.icon}
                                color={action.color}
                                onPress={() => router.push(action.route as any)}
                            />
                        </StaggeredFadeIn>
                    ))}
                    {row.length < cols && Array.from({ length: cols - row.length }).map((_, i) => (
                        <View key={`empty-${i}`} style={{ flex: 1 }} />
                    ))}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    actionGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
});






