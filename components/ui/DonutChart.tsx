import React from 'react';
import { Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

interface DonutChartProps {
    percent: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    label?: string;
    isDark?: boolean;
}

export const DonutChart = ({ percent, color, size = 80, strokeWidth = 6, label = "", isDark = true }: DonutChartProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <View
            style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}
            accessibilityLabel={`Gráfico de progreso: ${percent}% ${label}`}
            accessibilityRole="image"
        >
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isDark ? '#374151' : '#E5E7EB'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
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
                <Text style={{ fontSize: size * 0.22, fontWeight: '900', color: textPrimary }}>{percent}%</Text>
                {label ? <Text style={{ fontSize: size * 0.1, fontWeight: '800', color: textSecondary, marginTop: -2 }}>{label}</Text> : null}
            </View>
        </View>
    );
};
