import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

interface AnimatedButtonProps extends PressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
}

export function AnimatedButton({
    children,
    style,
    ...props
}: AnimatedButtonProps) {
    return (
        <Pressable {...props} style={style}>
            {children}
        </Pressable>
    );
}
