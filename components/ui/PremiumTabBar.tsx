import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
        <View
            style={[
                styles.tabBarWrapper,
                compact && styles.tabBarWrapperCompact,
                {
                    // El fondo sólido del envoltorio evita que asome ningún color
                    // claro (blanco) por las esquinas redondeadas de la barra.
                    backgroundColor: gradientColors[0],
                },
            ]}
        >
            <LinearGradient
                colors={gradientColors as unknown as readonly [string, string, ...string[]]}
                style={[
                    styles.tabBarContainer,
                    compact && styles.tabBarContainerCompact,
                    {
                        borderColor,
                        minHeight: compact ? 52 : 60,
                        paddingBottom: insets.bottom,
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
                        <View
                            style={[
                                styles.iconSlot,
                                compact && styles.iconSlotCompact,
                                isFocused ? { backgroundColor: gradientActiveBg } : null,
                            ]}
                        >
                            {options.tabBarIcon && options.tabBarIcon({
                                focused: isFocused,
                                color: isFocused ? activeTintColor : inactiveTintColor,
                                size: 22,
                            })}
                        </View>

                        {!compact && (
                            <Text
                                maxFontSizeMultiplier={1.2}
                                numberOfLines={1}
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
        </View>
    );
};

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 16,
    },
    // En horizontal la barra es más baja y la sombra más corta: con la pantalla
    // reducida, una sombra amplia se ve pesada y roba altura.
    tabBarWrapperCompact: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 8,
    },
    tabBarContainer: {
        flexDirection: 'row',
        minHeight: 60,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tabBarContainerCompact: {
        minHeight: 52,
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
        paddingHorizontal: 4,
        paddingVertical: 6,
        minHeight: 48,
    },
    tabItemCompact: {
        paddingVertical: 4,
        minHeight: 40,
    },
    tabLabel: {
        fontSize: 11,
        marginTop: 2,
        textAlign: 'center',
    },
    tabLabelActive: {
        fontWeight: '800',
    },
    tabLabelInactive: {
        fontWeight: '600',
    },
    // Cuadrado fijo con radio = mitad del lado: así el fondo del ítem activo
    // siempre es un círculo perfecto y no una píldora o un cuadrado redondeado.
    iconSlot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotCompact: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
});
