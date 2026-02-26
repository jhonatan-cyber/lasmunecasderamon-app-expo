import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GarzonActionCard } from './GarzonActionCard';

export const CajeroActionGrid = () => {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.actionGrid}>
                <GarzonActionCard
                    title="VENTAS"
                    description="Realizar nueva venta"
                    icon="cart"
                    color="#8B5CF6"
                    onPress={() => router.push('/cajero/ventas')}
                />
                <GarzonActionCard
                    title="CUENTAS"
                    description="Cuentas pendientes"
                    icon="receipt"
                    color="#3B82F6"
                    onPress={() => router.push('/cajero/cuentas')}
                />
            </View>

            <View style={[styles.actionGrid, { marginTop: 12 }]}>
                <GarzonActionCard
                    title="PEDIDOS"
                    description="Solicitudes del personal"
                    icon="notifications"
                    color="#EF4444"
                    onPress={() => router.push('/cajero/solicitudes')}
                />
                <GarzonActionCard
                    title="CAJA"
                    description="Control de cajas"
                    icon="cash"
                    color="#10B981"
                    onPress={() => router.push('/cajero/caja')}
                />
            </View>

            <View style={{ marginTop: 12 }}>
                <GarzonActionCard
                    title="ADMINISTRATIVO"
                    description="Liquidación y Calendario"
                    icon="stats-chart"
                    color="#6366F1"
                    onPress={() => router.push('/cajero/administrativo')}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginTop: 15, // Significant separation to prevent any overlap
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 12,
    },
});
