import { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, Dimensions, View } from 'react-native';
import { usePathname } from 'expo-router';

interface ScreenTransitionProps {
    children: ReactNode;
    style?: ViewStyle;
    animation?: 'fade' | 'slide' | 'scale' | 'slide-fade';
    duration?: number;
}

const { width, height } = Dimensions.get('window');

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
    children,
    style,
    animation = 'slide-fade',
    duration = 300,
}) => {
    const pathname = usePathname();
    const animatedValue = useRef(new Animated.Value(0)).current;
    const previousPath = useRef(pathname);

    useEffect(() => {
        if (previousPath.current !== pathname) {
            animatedValue.setValue(0);
            
            const animations: Animated.CompositeAnimation[] = [];

            if (animation === 'fade' || animation === 'slide-fade') {
                animations.push(
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration,
                        useNativeDriver: true,
                    })
                );
            }

            if (animation === 'slide' || animation === 'slide-fade') {
                animations.push(
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration,
                        useNativeDriver: true,
                    })
                );
            }

            if (animation === 'scale') {
                animations.push(
                    Animated.parallel([
                        Animated.timing(animatedValue, {
                            toValue: 1,
                            duration,
                            useNativeDriver: true,
                        }),
                        Animated.spring(animatedValue, {
                            toValue: 1,
                            friction: 8,
                            tension: 100,
                            useNativeDriver: true,
                        }),
                    ])
                );
            }

            Animated.parallel(animations).start();
            previousPath.current = pathname;
        }
    }, [pathname, animation, duration, animatedValue]);

    const animatedStyle = {
        opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: animation.includes('fade') ? [0, 1] : [1, 1],
        }),
        transform: [
            {
                translateX: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: animation.includes('slide') ? [width * 0.3, 0] : [0, 0],
                }),
            },
            {
                scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: animation === 'scale' ? [0.95, 1] : [1, 1],
                }),
            },
        ],
    };

    return (
        <Animated.View style={[styles.container, animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

interface StaggeredListItemProps {
    children: ReactNode;
    index: number;
    delay?: number;
    duration?: number;
}

export const StaggeredListItem: React.FC<StaggeredListItemProps> = ({
    children,
    index,
    delay = 50,
    duration = 300,
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(index * delay),
            Animated.timing(animatedValue, {
                toValue: 1,
                duration,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, delay, duration, animatedValue]);

    const animatedStyle = {
        opacity: animatedValue,
        transform: [
            {
                translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                }),
            },
        ],
    };

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

interface FadeInViewProps {
    children: ReactNode;
    duration?: number;
    delay?: number;
    style?: ViewStyle;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
    children,
    duration = 300,
    delay = 0,
    style,
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
        }).start();
    }, [duration, delay, animatedValue]);

    return (
        <Animated.View
            style={[
                { opacity: animatedValue },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
};

interface SlideInViewProps {
    children: ReactNode;
    direction?: 'left' | 'right' | 'up' | 'down';
    duration?: number;
    delay?: number;
    style?: ViewStyle;
}

export const SlideInView: React.FC<SlideInViewProps> = ({
    children,
    direction = 'up',
    duration = 300,
    delay = 0,
    style,
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;


    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
        }).start();
    }, [duration, delay, animatedValue]);

    const animatedStyle = {
        opacity: animatedValue,
        transform: [
            {
                translateX: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: direction === 'left' || direction === 'right' 
                        ? [direction === 'left' ? -width : width, 0] 
                        : [0, 0],
                }),
            },
            {
                translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: direction === 'up' || direction === 'down'
                        ? [direction === 'up' ? height : -height, 0]
                        : [0, 0],
                }),
            },
        ],
    };

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
};

export const AnimatedCard: React.FC<{
    children: ReactNode;
    index: number;
    style?: ViewStyle;
}> = ({ children, index, style }) => {
    return (
        <StaggeredListItem index={index} delay={80} duration={400}>
            <View style={style}>
                {children}
            </View>
        </StaggeredListItem>
    );
};

export const PageTransition = ({ children }: { children: ReactNode }) => (
    <ScreenTransition animation="slide-fade" duration={250}>
        {children}
    </ScreenTransition>
);

export const ModalTransition = ({ children }: { children: ReactNode }) => (
    <ScreenTransition animation="scale" duration={300}>
        {children}
    </ScreenTransition>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default {
    ScreenTransition,
    StaggeredListItem,
    FadeInView,
    SlideInView,
    AnimatedCard,
    PageTransition,
    ModalTransition,
};