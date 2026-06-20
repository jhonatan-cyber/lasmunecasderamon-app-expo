import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

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
}) => (
    <>
        {isOffline && (
            <MotiView
                from={{ opacity: 0, translateY: -20 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={[styles.offlineBanner, { backgroundColor: '#EF4444' }]}
            >
                <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
                <Text style={styles.offlineBannerText}>MODO OFFLINE - VIENDO DATOS GUARDADOS</Text>
            </MotiView>
        )}

        {totalAPagar > 0 && (
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={[styles.totalBanner, { backgroundColor: cardBg, borderColor, borderLeftColor: accentColor }]}
            >
                <View style={[styles.totalBannerIcon, { backgroundColor: `${accentColor}20` }]}>
                    <Ionicons name="cash-outline" size={22} color={accentColor} />
                </View>
                <View style={styles.totalBannerText}>
                    <Text style={[styles.totalBannerLabel, { color: textSecondary }]}>TOTAL A PAGAR EN ANTICIPOS</Text>
                    <Text style={[styles.totalBannerValue, { color: accentColor }]}>${totalAPagar.toLocaleString()}</Text>
                </View>
            </MotiView>
        )}
    </>
);

const styles = StyleSheet.create({
    offlineBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, paddingHorizontal: 16, gap: 10,
        margin: 16, marginBottom: 0, borderRadius: 12, elevation: 4,
    },
    offlineBannerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    totalBanner: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginBottom: 4,
        padding: 16, borderRadius: 20,
        borderWidth: 1, borderLeftWidth: 4, gap: 14, elevation: 2,
    },
    totalBannerIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    totalBannerText: { flex: 1 },
    totalBannerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    totalBannerValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
});
