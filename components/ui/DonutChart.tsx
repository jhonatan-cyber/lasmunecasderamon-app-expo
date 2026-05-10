import React from 'react';
import { Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import { MotiView } from 'moti';

interface DonutChartProps {
    percent: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    label?: string;
    isDark?: boolean;
}

export const DonutChart = ({ percent, color, size = 140, strokeWidth = 10, label = "", isDark = true }: DonutChartProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const textPrimary = isDark ? '#FFFFFF' : '#1E293B';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800 }}
            style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}
            accessibilityLabel={`Gráfico de progreso: ${percent}% ${label}`}
            accessibilityRole="image"
        >
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Background Circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isDark ? '#1E293B' : '#F1F5F9'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Circle */}
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
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: size * 0.18, fontWeight: '800', color: textPrimary, letterSpacing: -1 }}>
                    {percent}%
                </Text>
                {label ? (
                    <Text style={{ fontSize: size * 0.08, fontWeight: '600', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                        {label}
                    </Text>
                ) : null}
            </View>
        </MotiView>
    );
};
