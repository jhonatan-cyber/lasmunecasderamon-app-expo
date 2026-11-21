import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { FontSize } from '@/constants/spacing';

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
        accentColor,
        accentGlow,
        gradientText,
        gradientTextMuted,
        gradientActiveBg,
        gradientControlBorder,
        isDark,
    } = useAccentColor();
    const { isTablet, isLandscape } = useResponsiveMetrics();
    const reducedMotion = useReducedMotion();
    const compact = isLandscape && !isTablet;
    const insets = useSafeAreaInsets();

    // Micro-animación de scale para cada tab activo
    const tabScales = state.routes.map(() => useSharedValue(1));
    useEffect(() => {
        state.routes.forEach((_, i) => {
            const isActive = state.index === i;
            if (reducedMotion) {
                // Sin animación de escala cuando el usuario prefiere movimiento reducido.
                tabScales[i].value = isActive ? 1.08 : 1;
            } else {
                tabScales[i].value = withSpring(isActive ? 1.08 : 1, { damping: 15, stiffness: 200 });
            }
        });
    }, [state.index, state.routes, tabScales, reducedMotion]);

    // El texto de la barra se mide contra el color plano del acento: blanco
    // en los acentos profundos y casi negro en los neón luminosos. Ambos
    // superan 4.5:1 (ver `resolveAccentSurface`).
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
                    backgroundColor: accentColor,
                    // La sombra de la barra más el halo neón del acento: la luz
                    // que escapa del color hacia el contenido.
                    boxShadow: `0 -4px 16px rgba(0,0,0,0.18), ${accentGlow}`,
                },
            ]}
        >
            <View
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

                // Animated scale wrapper
                const animatedStyle = useAnimatedStyle(() => ({
                    transform: [{ scale: tabScales[index].value }],
                }));

                // Glow neón en modo oscuro para el tab activo
                const neonGlow = isDark && isFocused ? {
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 4,
                } : {};

                return (
                    <Animated.View key={route.key} style={[animatedStyle, styles.tabWrapper]}>
                        <Pressable
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
                                    isFocused ? { backgroundColor: gradientActiveBg, ...neonGlow } : null,
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
                        {/* Indicador de dot animado debajo del tab activo */}
                        {isFocused && !compact && (
                            <View style={styles.dotIndicatorContainer}>
                                <Animated.View style={[styles.dotIndicator, { backgroundColor: accentColor }]}>
                                    {isDark && (
                                        <View style={[styles.dotGlow, { backgroundColor: `${accentColor}80` }]} />
                                    )}
                                </Animated.View>
                            </View>
                        )}
                    </Animated.View>
                );
            })}
            </View>
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
        fontSize: FontSize.xxs,
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
        overflow: 'hidden',
    },
    iconSlotCompact: {
        width: 30,
        height: 30,
        borderRadius: 15,
        overflow: 'hidden',
    },
    tabWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    dotIndicatorContainer: {
        alignItems: 'center',
        marginTop: 2,
        height: 4,
    },
    dotIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        width: 12,
        height: 12,
        borderRadius: 6,
        opacity: 0.6,
    },
});
