import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

interface StaggeredFadeInProps {
    children: React.ReactNode;
    index: number;
    delayStep?: number;
    duration?: number;
    style?: StyleProp<ViewStyle>;
}

export function StaggeredFadeIn({
    children,
    index,
    delayStep = 100,
    duration = 400,
    style,
}: StaggeredFadeInProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(15);

    useEffect(() => {
        opacity.value = withDelay(
            index * delayStep,
            withTiming(1, {
                duration,
                easing: Easing.out(Easing.back(1)),
            })
        );
        translateY.value = withDelay(
            index * delayStep,
            withTiming(0, {
                duration,
                easing: Easing.out(Easing.back(1)),
            })
        );
    }, [index, delayStep, duration, opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
}
