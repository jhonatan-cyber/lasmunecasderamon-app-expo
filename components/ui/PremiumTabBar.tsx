import React, { useEffect } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { useAccentColor } from '@/hooks/useAccentColor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PremiumTabBarProps = {
    state: {
        index: number;
        routes: { key: string; name: string; params?: any }[];
    };
    descriptors: Record<
        string,
        {
            options: {
                href?: string | null;
                tabBarLabel?: React.ReactNode;
                title?: string;
                tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
            };
        }
    >;
    navigation: {
        emit: (event: {
            type: 'tabPress';
            target: string;
            canPreventDefault: true;
        }) => { defaultPrevented: boolean };
        navigate: (name: string, params?: any) => void;
    };
};

export const PremiumTabBar = ({ state, descriptors, navigation }: PremiumTabBarProps) => {
    const { gradientColors } = useAccentColor();
    const insets = useSafeAreaInsets();
    const indicatorPosition = useSharedValue(0);
    
    
    const activeTintColor = '#FFFFFF';
    const inactiveTintColor = 'rgba(255, 255, 255, 0.6)';
    const borderColor = 'rgba(255, 255, 255, 0.1)';

    const visibleRoutes = state.routes.filter((r: any) => {
        const options = descriptors[r.key].options as any;
        return options.href !== null;
    });

    const numTabs = visibleRoutes.length || 1;
    const tabWidth = SCREEN_WIDTH / numTabs;

    const activeRouteKey = state.routes[state.index].key;
    const visualIndex = visibleRoutes.findIndex((r: any) => r.key === activeRouteKey);

    useEffect(() => {
        const targetPos = visualIndex >= 0 ? visualIndex * tabWidth : 0;
        indicatorPosition.value = withSpring(targetPos, {
            damping: 18,
            stiffness: 150,
        });
    }, [visualIndex, tabWidth, indicatorPosition]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorPosition.value }],
    }));

    return (
        <LinearGradient
            colors={gradientColors as unknown as readonly [string, string, ...string[]]}
            style={[styles.tabBarContainer, { paddingBottom: insets.bottom, borderTopColor: borderColor }]}
        >
            {}
            <Animated.View style={[
                styles.indicator,
                { width: tabWidth },
                indicatorStyle
            ]}>
            </Animated.View>

            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];

                if ((options as any).href === null) return null;

                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const isCenter = route.name === 'index';

                return (
                    <Pressable
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        style={styles.tabItem}
                    >
                        <View style={[
                            isFocused && !isCenter ? [styles.activeIconBg, { backgroundColor: 'rgba(255,255,255,0.15)' }] : null,
                            isCenter && isFocused ? [styles.activeCenterIconBg, { backgroundColor: 'rgba(255,255,255,0.15)' }] : null,
                            isCenter ? styles.centerTab : null
                        ]}>
                            {options.tabBarIcon && options.tabBarIcon({
                                focused: isFocused,
                                color: isFocused ? activeTintColor : inactiveTintColor,
                                size: isCenter ? 26 : 22,
                            })}
                        </View>

                        {}
                        {!isCenter && label !== 'Inicio' && (
                            <Text style={[styles.tabLabel, { color: isFocused ? activeTintColor : inactiveTintColor }]}>
                                {label as string}
                            </Text>
                        )}
                    </Pressable>
                );
            })}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    tabBarContainer: {
        flexDirection: 'row',
        minHeight: Platform.OS === 'ios' ? 88 : 68,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
    },
    indicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicatorInner: {
        width: '70%',
        height: 44,
        borderRadius: 22,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    activeIconBg: {
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        padding: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: -4,
    },
    activeCenterIconBg: {
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        padding: 10,
        borderRadius: 24,
    },
    centerTab: {
        transform: [{ scale: 1.1 }],
    }
});

