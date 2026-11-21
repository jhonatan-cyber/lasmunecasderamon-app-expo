import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface DonutChartProps {
    percent: number;
    color: string;
    size?: number;
    strokeWidth?: number;
    label?: string;
    isDark?: boolean;
}

export const DonutChart = ({ percent, color, size = 140, strokeWidth = 10, label = "", isDark = true }: DonutChartProps) => {
    const reducedMotion = useReducedMotion();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const textPrimary = isDark ? '#FFFFFF' : '#1E293B';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';

    // Animación de draw del círculo
    const drawProgress = useSharedValue(0);
    useEffect(() => {
        if (reducedMotion) {
            // Sin animación cuando el usuario prefiere movimiento reducido.
            drawProgress.value = percent;
            return;
        }
        drawProgress.value = withDelay(300, withTiming(percent, { duration: 1000 }));
    }, [percent, drawProgress, reducedMotion]);

    const currentDashoffset = useAnimatedStyle(() => {
        const currentPercent = drawProgress.value;
        const currentOffset = circumference - (currentPercent / 100) * circumference;
        return { opacity: 1 };
    });

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
                <Text style={{ fontSize: size * 0.18, fontWeight: '800', color: textPrimary, letterSpacing: -1 }}>
                    {percent}%
                </Text>
                {label ? (
                    <Text style={{ fontSize: size * 0.08, fontWeight: '600', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                        {label}
                    </Text>
                ) : null}
            </View>
        </AnimatedView>
    );
};
