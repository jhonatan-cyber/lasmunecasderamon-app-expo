import React, { useEffect } from 'react';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming
} from 'react-native-reanimated';

interface AnimatedScreenProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    initialOffset?: number;
}

export function AnimatedScreen({
    children,
    delay = 0,
    duration = 500,
    initialOffset = 20
}: AnimatedScreenProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(initialOffset);

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withTiming(1, { duration, easing: Easing.out(Easing.quad) })
        );
        translateY.value = withDelay(
            delay,
            withTiming(0, { duration, easing: Easing.out(Easing.quad) })
        );
    }, [delay, duration, opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
            flex: 1,
        };
    });

    return (
        <Animated.View style={animatedStyle}>
            {children}
        </Animated.View>
    );
}
