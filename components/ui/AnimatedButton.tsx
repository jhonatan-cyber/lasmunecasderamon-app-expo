import { haptic } from '@/utils/haptics';
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedButtonProps extends Omit<PressableProps, 'style'> {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    enableHaptics?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedButton({
    children,
    style,
    scaleTo = 0.95,
    disabled,
    enableHaptics = true,
    ...props
}: AnimatedButtonProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        } as any;
    });

    const handlePressIn = () => {
        if (disabled) return;
        if (enableHaptics) {
            haptic.tap();
        }
        scale.set(withSpring(scaleTo, { damping: 18, stiffness: 200 }));
        opacity.set(withTiming(0.85, { duration: 100 }));
    };

    const handlePressOut = () => {
        scale.set(withSpring(1, { damping: 15, stiffness: 200 }));
        opacity.set(withTiming(1, { duration: 100 }));
    };

    return (
        <AnimatedPressable
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[style, animatedStyle] as StyleProp<ViewStyle>}
        >
            {children}
        </AnimatedPressable>
    );
}
