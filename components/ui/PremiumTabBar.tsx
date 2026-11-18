import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';

type PremiumTabBarProps = {
    state: {
        index: number;
        routes: { key: string; name: string; params?: any }[];
    };
    emitter: {
        emit: (event: {
            type: 'tabPress';
            target: string;
            canPreventDefault: boolean;
        }) => { defaultPrevented: boolean };
    };
    navigateToTab: (routeKey: string) => void;
    descriptors: Record<
        string,
        {
            options: {
                href?: string | null;
                tabBarItemStyle?: { display?: string };
                tabBarLabel?: React.ReactNode;
                title?: string;
                tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
            };
        }
    >;
};

export const PremiumTabBar = ({
    state,
    emitter,
    navigateToTab,
    descriptors,
}: PremiumTabBarProps) => {
    const {
        gradientColors,
        gradientText,
        gradientTextMuted,
        gradientOverlay,
        gradientActiveBg,
        gradientControlBorder,
    } = useAccentColor();
    const { isTablet, isLandscape } = useResponsiveMetrics();
    const compact = isLandscape && !isTablet;
    const insets = useSafeAreaInsets();

    // El blanco puro sobre el degradado no llega a 4.5:1 en varios acentos
    // (ámbar 3.2:1, esmeralda 3.8:1). El velo oscuro sube el contraste de toda
    // la barra por encima de AA sin perder el color de marca.
    const activeTintColor = gradientText;
    const inactiveTintColor = gradientTextMuted;
    const borderColor = gradientControlBorder;

    const estaOculta = (options: any) =>
        options.href === null || options.tabBarItemStyle?.display === 'none';

    return (
        <LinearGradient
            colors={gradientColors as unknown as readonly [string, string, ...string[]]}
            style={[
                styles.tabBarContainer,
                {
                    paddingBottom: insets.bottom,
                    borderTopColor: borderColor,
                    minHeight: compact ? 52 : Platform.OS === 'ios' ? 88 : 68,
                    borderRadius: 24,
                    overflow: 'hidden',
                },
            ]}
        >
                <View pointerEvents="none" style={[styles.scrim, { backgroundColor: gradientOverlay }]} />

            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];

                if (estaOculta(options)) return null;

                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = emitter.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigateToTab(route.key);
                    }
                };

                const isCenter = route.name === 'index';
                const labelText = typeof label === 'string' ? label : route.name;

                return (
                    <Pressable
                        key={route.key}
                        accessibilityRole="tab"
                        accessibilityLabel={labelText}
                        accessibilityState={isFocused ? { selected: true } : {}}
                        hitSlop={{ top: 6, bottom: 6 }}
                        onPress={onPress}
                        style={[styles.tabItem, compact && styles.tabItemCompact]}
                    >
                        <View style={[
                            isFocused && !isCenter ? [styles.activeIconBg, { backgroundColor: gradientActiveBg }] : null,
                            isCenter && isFocused ? [styles.activeCenterIconBg, { backgroundColor: gradientActiveBg }] : null,
                            isCenter ? styles.centerTab : null
                        ]}>
                            {options.tabBarIcon && options.tabBarIcon({
                                focused: isFocused,
                                color: isFocused ? activeTintColor : inactiveTintColor,
                                size: isCenter ? 26 : 22,
                            })}
                        </View>

                        {!isCenter && !compact && labelText !== 'Inicio' && (
                            <Text
                                maxFontSizeMultiplier={1.3}
                                style={[
                                    styles.tabLabel,
                                    { color: isFocused ? activeTintColor : inactiveTintColor },
                                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                                ]}
                            >
                                {labelText}
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
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    scrim: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.20)',
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        minHeight: 48,
    },
    tabItemCompact: {
        paddingVertical: 4,
        minHeight: 40,
    },
    tabLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    tabLabelActive: {
        fontWeight: '800',
    },
    tabLabelInactive: {
        fontWeight: '600',
    },
    activeIconBg: {
        padding: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: -4,
    },
    activeCenterIconBg: {
        padding: 10,
        borderRadius: 24,
    },
    centerTab: {
        transform: [{ scale: 1.1 }],
    },
});
