import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';

interface CajaSectionProps {
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/** Agrupa las métricas de caja por el significado del dinero, no en una grilla plana. */
export function CajaSection({ title, subtitle, icon, children, style }: CajaSectionProps) {
    const { accentOnSurface, textPrimary, textSecondary, borderColor } = useAccentColor();

    return (
        <View style={[styles.section, { borderTopColor: borderColor }, style]}>
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: `${accentOnSurface}18` }]}>
                    <Ionicons name={icon} size={16} color={accentOnSurface} />
                </View>
                <View style={styles.titles}>
                    <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
                    {subtitle ? (
                        <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
                    ) : null}
                </View>
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        borderTopWidth: 1,
        paddingTop: 16,
        gap: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titles: { flex: 1 },
    title: {
        fontSize: 13,
        fontFamily: FontFamily.extrabold,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    subtitle: {
        fontSize: 11,
        fontFamily: FontFamily.medium,
        marginTop: 2,
    },
});
