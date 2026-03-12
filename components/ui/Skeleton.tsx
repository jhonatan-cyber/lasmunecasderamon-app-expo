import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}) => {
    const isDark = useColorScheme() === 'dark';
    const shimmerValue = useSharedValue(0);

    const baseColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)';

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, { duration: 1500 }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerValue.value,
            [0, 1],
            [-200, 200]
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View
            style={[
                styles.container,
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    backgroundColor: baseColor
                },
                style,
            ]}
        >
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <LinearGradient
                    colors={['transparent', shimmerColor, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
