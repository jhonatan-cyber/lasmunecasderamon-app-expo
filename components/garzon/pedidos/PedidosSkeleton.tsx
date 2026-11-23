import React from 'react';
import { Platform, View, AccessibilityRole } from 'react-native';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from '@/components/ui/Skeleton';

interface PedidosSkeletonProps {
    bg: string;
    gradientColors: string[];
    insets: { top: number };
}

export const PedidosSkeleton: React.FC<PedidosSkeletonProps> = ({ bg, gradientColors, insets }) => {
    const { width, isTablet, isLandscape } = useResponsiveMetrics();
    const columnas = isTablet || isLandscape ? 3 : 2;
    const cardWidth = (width - 55 - (columnas - 1) * 15) / columnas;

    return (
    <View style={{ flex: 1, backgroundColor: bg }}>
        <LinearGradient
            colors={gradientColors as unknown as readonly [string, string, ...string[]]}
            style={{
                paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                paddingBottom: 25,
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
                minHeight: 140,
                paddingHorizontal: 20,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={150} height={30} accessibilityRole="button" accessibilityLabel="Ver pedido" />
                <Skeleton width={44} height={44} borderRadius={22} accessibilityRole="button" accessibilityLabel="Ver detalle" />
            </View>
            <Skeleton width="60%" height={24} />
        </LinearGradient>

        <View style={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} width={cardWidth} height={180} borderRadius={24} accessibilityRole="button" accessibilityLabel="Ver pedido" />
            ))}
        </View>
    </View>
    );
};
