import React from 'react';
import { Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { FontFamily } from '@/constants/fonts';

export interface DonutChartLegendItem {
    label: string;
    value: number;
    color: string;
}

export interface DonutChartProps {
    percent: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    label?: string;
    isDark?: boolean;
    legend?: DonutChartLegendItem[];
}

export const DonutChart = ({ percent, color, size = 140, strokeWidth = 10, label = "", isDark = true, legend }: DonutChartProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const textPrimary = isDark ? '#FFFFFF' : '#1E293B';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';

    // Glow neón en modo oscuro alrededor del anillo
    const neonGlow = isDark ? {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    } : {};

    return (
        <AnimatedView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800 }}
            style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}
            accessibilityLabel={`Gráfico de progreso: ${percent}% ${label}`}
            accessibilityRole="image"
        >
            <View style={[{ ...neonGlow }]}>
                <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                    {}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={isDark ? '#1E293B' : '#F1F5F9'}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </Svg>
            </View>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: size * 0.18, fontFamily: FontFamily.bold, color: textPrimary, letterSpacing: -1 }}>
                    {percent}%
                </Text>
                {label ? (
                    <Text style={{ fontSize: size * 0.08, fontFamily: FontFamily.semibold, color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                        {label}
                    </Text>
                ) : null}
            </View>
            {legend && legend.length > 0 && (
                <View
                    style={{ marginTop: size / 2 + 12, width: size }}
                    accessibilityRole="list"
                    accessibilityLabel="Leyenda del gráfico"
                >
                    {legend.map((item, idx) => (
                        <View
                            key={idx}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx < legend.length - 1 ? 6 : 0 }}
                            accessibilityRole="listitem"
                        >
                            <View
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 3,
                                    backgroundColor: item.color,
                                    marginRight: 8,
                                }}
                                accessibilityLabel={item.label}
                                accessibilityRole="image"
                            />
                            <Text
                                style={{ fontSize: 12, fontFamily: FontFamily.medium, color: textSecondary, flex: 1 }}
                            >
                                {item.label}
                            </Text>
                            <Text
                                style={{ fontSize: 12, fontFamily: FontFamily.bold, color: textPrimary }}
                            >
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </AnimatedView>
    );
};
