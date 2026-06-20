import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

interface CajaSkeletonProps {
    cardBg: string;
    borderColor: string;
}

export function CajaSkeleton({ cardBg, borderColor }: CajaSkeletonProps) {
    return (
        <View style={{ gap: 16, padding: 16 }}>
            {}
            <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, padding: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={130} height={32} borderRadius={20} />
                    <Skeleton width={90} height={36} borderRadius={12} />
                </View>
                <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 16 }} />
                <Skeleton width={200} height={14} borderRadius={8} />
            </View>

            {}
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, flex: 1, padding: 16 }]}>
                    <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 12 }} />
                    <Skeleton width={60} height={10} borderRadius={6} />
                    <Skeleton width={90} height={26} borderRadius={8} style={{ marginTop: 8 }} />
                </View>
                <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, flex: 1, padding: 16 }]}>
                    <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 12 }} />
                    <Skeleton width={60} height={10} borderRadius={6} />
                    <Skeleton width={90} height={26} borderRadius={8} style={{ marginTop: 8 }} />
                </View>
            </View>

            {}
            <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor, gap: 16, padding: 20 }]}>
                <Skeleton width={140} height={14} borderRadius={8} />
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Skeleton width={110} height={12} borderRadius={6} />
                        <Skeleton width={70} height={12} borderRadius={6} />
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    skeletonCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
});
