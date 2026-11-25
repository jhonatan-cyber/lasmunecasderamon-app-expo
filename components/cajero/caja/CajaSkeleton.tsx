import { StyleSheet, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { Skeleton } from '@/components/ui/Skeleton';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { columnasCaja } from '@/utils/cajaLayout';

interface CajaSkeletonProps {
    cardBg: string;
    borderColor: string;
    columnas?: number;
}

/**
 * Esqueleto con la misma estructura que la pantalla de caja: estado, balance,
 * las tres secciones de métricas y el detalle adicional.
 */
export function CajaSkeleton({ cardBg, borderColor, columnas }: CajaSkeletonProps) {
    const { isTablet, isLandscape } = useResponsiveMetrics();
    const columnasEfectivas = columnas ?? columnasCaja(isTablet, isLandscape);

    return (
        <View style={styles.content}>
            <View style={[styles.card, styles.statusCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.rowBetween}>
                    <Skeleton width={120} height={30} borderRadius={20} accessibilityLabel="Estado de caja" />
                    <Skeleton width={92} height={34} borderRadius={12} accessibilityLabel="Acciones de caja" />
                </View>
                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                <Skeleton width={190} height={14} borderRadius={7} accessibilityLabel="Hora de apertura" />
            </View>

            <View style={[styles.card, styles.hero, { backgroundColor: cardBg, borderColor }]}>
                <Skeleton width={100} height={12} borderRadius={6} accessibilityLabel="Balance total" />
                <Skeleton width="60%" height={38} borderRadius={9} />
                <Skeleton width="80%" height={12} borderRadius={6} />
            </View>

            <SectionPlaceholder cardBg={cardBg} borderColor={borderColor} count={4} columnas={columnasEfectivas} />
            <SectionPlaceholder cardBg={cardBg} borderColor={borderColor} count={3} columnas={columnasEfectivas} />
            <SectionPlaceholder cardBg={cardBg} borderColor={borderColor} count={4} columnas={columnasEfectivas} />

            <View style={[styles.card, styles.detail, { backgroundColor: cardBg, borderColor }]}>
                <Skeleton width={150} height={16} borderRadius={8} accessibilityLabel="Detalle adicional" />
                {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.rowBetween}>
                        <Skeleton width="45%" height={12} borderRadius={6} />
                        <Skeleton width="25%" height={12} borderRadius={6} />
                    </View>
                ))}
                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                <Skeleton width="65%" height={20} borderRadius={8} accessibilityLabel="Monto de cierre previsto" />
            </View>
        </View>
    );
}

function SectionPlaceholder({
    cardBg,
    borderColor,
    count,
    columnas = 2,
}: CajaSkeletonProps & { count: number }) {
    const basis = columnas >= 4 ? '23%' : columnas === 3 ? '31%' : '47%';
    return (
        <View style={[styles.section, { borderTopColor: borderColor }]}>
            <View style={styles.sectionHeader}>
                <Skeleton width={32} height={32} borderRadius={BorderRadius.full} />
                <View style={styles.sectionTitles}>
                    <Skeleton width="55%" height={13} borderRadius={6} />
                    <Skeleton width="75%" height={10} borderRadius={5} />
                </View>
            </View>
            <View style={styles.metrics}>
                {Array.from({ length: count }).map((_, i) => (
                    <View
                        key={i}
                        style={[styles.card, styles.metricCard, { backgroundColor: cardBg, borderColor, flexBasis: basis }]}
                    >
                        <Skeleton width={36} height={36} borderRadius={10} />
                        <Skeleton width="70%" height={10} borderRadius={6} />
                        <Skeleton width="55%" height={20} borderRadius={7} />
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { gap: 12, padding: 16 },
    card: { borderRadius: BorderRadius.card, borderWidth: 1, padding: 16 },
    statusCard: { borderRadius: BorderRadius.card },
    hero: { alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    divider: { height: 1, marginVertical: 14 },
    section: { borderTopWidth: 1, paddingTop: 16, gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitles: { flex: 1, gap: 4 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricCard: { gap: 8 },
    detail: { gap: 14 },
});
