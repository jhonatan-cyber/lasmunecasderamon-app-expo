import React from 'react';
import { Dimensions, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from '@/components/ui/Skeleton';

const { width } = Dimensions.get('window');

interface PedidosSkeletonProps {
    bg: string;
    gradientColors: string[];
    insets: { top: number };
}

export const PedidosSkeleton: React.FC<PedidosSkeletonProps> = ({ bg, gradientColors, insets }) => (
    <View style={{ flex: 1, backgroundColor: bg }}>
        <LinearGradient
            colors={gradientColors as any}
            style={{
                paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                paddingBottom: 25,
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
                height: 160,
                paddingHorizontal: 20,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={150} height={30} />
                <Skeleton width={44} height={44} borderRadius={22} />
            </View>
            <Skeleton width="60%" height={24} />
        </LinearGradient>

        <View style={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} width={(width - 55) / 2} height={180} borderRadius={24} />
            ))}
        </View>
    </View>
);
