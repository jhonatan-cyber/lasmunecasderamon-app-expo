import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';

export interface ProgressBarProps {
    /** 0-100 progress value. Omit for indeterminate mode. */
    progress?: number;
    color?: string;
    height?: number;
    message?: string;
    style?: any;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    color,
    height = 6,
    message,
    style,
}) => {
    const { accentColor, isDark, textSecondary } = useAccentColor();
    const barColor = color || accentColor;
    const indeterminateTranslateX = useSharedValue(-100);

    useEffect(() => {
        if (progress === undefined) {
            indeterminateTranslateX.value = withRepeat(
                withTiming(200, { duration: 1200 }),
                -1,
                false,
            );
        }
    }, [progress, indeterminateTranslateX]);

    const indeterminateStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indeterminateTranslateX.value }],
    }));

    const indeterminateWidth = useAnimatedStyle(() => {
        const translateX = indeterminateTranslateX.value;
        const width = interpolate(translateX, [-100, 0, 100, 200], [20, 40, 20, 5]);
        return { width: `${width}%` };
    });

    return (
        <View style={style}>
            {message && (
                <Text style={[styles.message, { color: textSecondary }]}>
                    {message}
                </Text>
            )}
            <View style={[
                styles.track,
                {
                    height,
                    borderRadius: BorderRadius.xs,
                    backgroundColor: isDark ? '#374151' : '#E5E7EB',
                },
            ]}>
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            height,
                            borderRadius: BorderRadius.xs,
                            backgroundColor: barColor,
                            ...(progress !== undefined
                                ? { width: `${progress}%` }
                                : [indeterminateStyle, indeterminateWidth]),
                        },
                    ]}
                />
            </View>
            {progress !== undefined && (
                <Text style={[styles.percentage, { color: textSecondary }]}>
                    {Math.round(progress)}%
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        width: '100%',
        overflow: 'hidden',
    },
    fill: {
        height: 6,
    },
    message: {
        fontSize: FontSize.xs,
        fontWeight: '500',
        marginBottom: 6,
    },
    percentage: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'right',
    },
});
