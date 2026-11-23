import React from 'react';
import { BorderRadius } from '@/constants/spacing';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';

interface SolicitudBannersProps {
    isOffline: boolean;
    totalAPagar: number;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textSecondary: string;
}

export const SolicitudBanners: React.FC<SolicitudBannersProps> = ({
    isOffline,
    totalAPagar,
    accentColor,
    cardBg,
    borderColor,
    textSecondary,
} ) => {
    const { accentOnSurface, accentColor: dangerColor, accentText } = useAccentColor();
    return (
    <>
        {isOffline && (
            <AnimatedView
                from={{ opacity: 0, translateY: -20 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={[styles.offlineBanner, { backgroundColor: dangerColor }]}
            >
                <Ionicons name="cloud-offline" size={20} color={accentText} />
                <Text style={styles.offlineBannerText}>MODO OFFLINE - VIENDO DATOS GUARDADOS</Text>
            </AnimatedView>
        )}

        {totalAPagar > 0 && (
            <AnimatedView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={[styles.totalBanner, { backgroundColor: cardBg, borderColor, borderLeftColor: accentColor }]}
            >
                <View style={[styles.totalBannerIcon, { backgroundColor: `${accentColor}20` }]}>
                    <Ionicons name="cash-outline" size={22} color={accentOnSurface} />
                </View>
                <View style={styles.totalBannerText}>
                    <Text style={[styles.totalBannerLabel, { color: textSecondary }]}>TOTAL A PAGAR EN ANTICIPOS</Text>
                    <Text style={[styles.totalBannerValue, { color: accentOnSurface }]}>${totalAPagar.toLocaleString()}</Text>
                </View>
            </AnimatedView>
        )}
    </>
);
};

const styles = StyleSheet.create({
    offlineBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, paddingHorizontal: 16, gap: 10,
        margin: 16, marginBottom: 0, borderRadius: BorderRadius.full, elevation: 4,
    },
    offlineBannerText: { color: '#FFFFFF', fontSize: 11, fontFamily: FontFamily.black, letterSpacing: 1 },
    totalBanner: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginBottom: 4,
        padding: 16, borderRadius: BorderRadius.full,
        borderWidth: 1, borderLeftWidth: 4, gap: 14, elevation: 2,
    },
    totalBannerIcon: { width: 48, height: 48, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center' },
    totalBannerText: { flex: 1 },
    totalBannerLabel: { fontSize: 10, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    totalBannerValue: { fontSize: 24, fontFamily: FontFamily.black, letterSpacing: -0.5 },
});
