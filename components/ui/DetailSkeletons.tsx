import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { BorderRadius } from '@/constants/spacing';

/**
 * Skeleton loader para modales de detalle de cuenta.
 * Refleja la estructura real: header, info cards, lista de detalles, y botón cerrar.
 */
export const CuentaDetailSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Skeleton style={styles.headerIcon} />
                <View style={styles.headerTexts}>
                    <Skeleton width={120} height={16} />
                    <Skeleton width={80} height={12} />
                </View>
                <Skeleton style={styles.closeBtn} />
            </View>

            {/* Info cards */}
            <View style={styles.infoGrid}>
                <Skeleton style={[styles.infoCard, { borderRadius: BorderRadius.xl }]} />
                <Skeleton style={[styles.infoCard, { borderRadius: BorderRadius.xl }]} />
                <Skeleton style={[styles.infoCard, { borderRadius: BorderRadius.xl }]} />
                <Skeleton style={[styles.infoCard, { borderRadius: BorderRadius.xl }]} />
            </View>

            {/* Details list */}
            <View style={styles.detailsList}>
                <Skeleton width={140} height={14} style={styles.sectionLabel} />
                <Skeleton style={[styles.detailItem, { borderRadius: BorderRadius.xl }]} />
                <Skeleton style={[styles.detailItem, { borderRadius: BorderRadius.xl }]} />
                <Skeleton style={[styles.detailItem, { borderRadius: BorderRadius.xl }]} />
            </View>

            {/* Close button */}
            <Skeleton style={[styles.closeBtnFull, { borderRadius: BorderRadius.button }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        gap: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerTexts: {
        flex: 1,
        gap: 6,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    infoCard: {
        width: '48%',
        height: 60,
    },
    detailsList: {
        gap: 10,
    },
    sectionLabel: {
        marginBottom: 4,
    },
    detailItem: {
        height: 70,
    },
    closeBtnFull: {
        height: 50,
        marginTop: 8,
    },
});
