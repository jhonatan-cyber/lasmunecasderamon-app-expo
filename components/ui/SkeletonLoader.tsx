import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}: SkeletonLoaderProps) {
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, { duration: 1500 }),
            -1,
            false
        );
    }, [shimmerValue]);

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerValue.value,
            [0, 1],
            [-150, 150]
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View
            style={[
                styles.container,
                { width: width as any, height: height as any, borderRadius },
                style,
            ]}
        >
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <LinearGradient
                    colors={['transparent', 'rgba(255, 255, 255, 0.2)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
    },
});
