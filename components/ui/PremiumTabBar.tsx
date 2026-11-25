import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

interface PremiumTabItemProps {
    route: any;
    index: number;
    isFocused: boolean;
    tabScale: SharedValue<number>;
    onPress: () => void;
    labelText: string;
    options: any;
    descriptors: any;
    compact: boolean;
    isDark: boolean;
    accentColor: string;
    activeTintColor: string;
    inactiveTintColor: string;
    gradientActiveBg: string;
}

function PremiumTabItem({
    route,
    index,
    isFocused,
    tabScale,
    onPress,
    labelText,
    options,
    compact,
    isDark,
    accentColor,
    activeTintColor,
    inactiveTintColor,
    gradientActiveBg,
}: PremiumTabItemProps) {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tabScale.value }],
    }));

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
}

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

    // Guardia defensiva: state.routes y state.index pueden ser undefined durante
    // la inicialización de React Navigation.
    const routes = state.routes ?? [];
    const currentIndex = state.index ?? 0;

    // Micro-animación de scale para cada tab — se crean directamente en el cuerpo
    // del componente (no dentro de useMemo) para cumplir con las reglas de hooks
    // de React. Se usa un número fijo máximo de 6 tabs, suficiente para cualquier
    // configuración de navegación de la app.
    const MAX_TABS = 6;
    const sv0 = useSharedValue(1);
    const sv1 = useSharedValue(1);
    const sv2 = useSharedValue(1);
    const sv3 = useSharedValue(1);
    const sv4 = useSharedValue(1);
    const sv5 = useSharedValue(1);
    const tabScales: SharedValue<number>[] = [sv0, sv1, sv2, sv3, sv4, sv5];

    useEffect(() => {
        if (!routes.length) return;
        const scales = [sv0, sv1, sv2, sv3, sv4, sv5];
        for (let i = 0; i < Math.min(routes.length, MAX_TABS); i++) {
            const isActive = currentIndex === i;
            const sv = scales[i];
            if (reducedMotion) {
                sv.value = isActive ? 1.08 : 1;
            } else {
                sv.value = withSpring(isActive ? 1.08 : 1, { damping: 15, stiffness: 200 });
            }
        }
    }, [currentIndex, routes.length, reducedMotion, sv0, sv1, sv2, sv3, sv4, sv5]);

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
            {routes.map((route: any, index: number) => {
                const descriptor = descriptors[route.key];
                const options = descriptor?.options;

                // Si no hay descriptor ni options, saltar esta ruta para evitar crash.
                if (!options) return null;
                if (estaOculta(options)) return null;

                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = currentIndex === index;

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

                // Guardia: si tabScales[index] no existe, no renderizar este tab.
                const tabScale = tabScales[index];
                if (!tabScale) return null;

                return (
                    <PremiumTabItem
                        key={route.key}
                        route={route}
                        index={index}
                        isFocused={isFocused}
                        tabScale={tabScale}
                        onPress={onPress}
                        labelText={labelText}
                        options={options}
                        descriptors={descriptors}
                        compact={compact}
                        isDark={isDark}
                        accentColor={accentColor}
                        activeTintColor={activeTintColor}
                        inactiveTintColor={inactiveTintColor}
                        gradientActiveBg={gradientActiveBg}
                    />
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
        fontFamily: FontFamily.bold,
    },
    tabLabelInactive: {
        fontFamily: FontFamily.semibold,
    },
    // Cuadrado fijo con radio = mitad del lado: así el fondo del ítem activo
    // siempre es un círculo perfecto y no una píldora o un cuadrado redondeado.
    iconSlot: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    iconSlotCompact: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
    },
    dotGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        width: 12,
        height: 12,
        borderRadius: BorderRadius.full,
        opacity: 0.6,
    },
});
