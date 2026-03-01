import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PremiumTabBar - Refactorizado para cumplir estrictamente con las reglas de Hooks
 * y evitar errores en React 19 / New Architecture.
 */
export const PremiumTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    // === 1. HOOKS (Siempre al inicio) ===
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const indicatorPosition = useSharedValue(0);

    // === 2. LÓGICA DE NEGOCIO Y ESTILOS ===
    const isDark = (colorScheme ?? 'dark') === 'dark';
    const bgColor = isDark ? '#0F172A' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const activeTintColor = '#8B5CF6';
    const inactiveTintColor = isDark ? '#9CA3AF' : '#6B7280';

    // Se filtran las rutas que no deben aparecer en el TabBar
    const visibleRoutes = state.routes.filter(r => {
        const options = descriptors[r.key].options as any;
        return options.href !== null;
    });

    const numTabs = visibleRoutes.length || 1;
    const tabWidth = SCREEN_WIDTH / numTabs;

    // Encontrar el índice visual real de la ruta activa
    const activeRouteKey = state.routes[state.index].key;
    const visualIndex = visibleRoutes.findIndex(r => r.key === activeRouteKey);

    // === 3. EFECTOS Y ESTILOS ANIMADOS ===
    useEffect(() => {
        const targetPos = visualIndex >= 0 ? visualIndex * tabWidth : 0;
        indicatorPosition.value = withSpring(targetPos, {
            damping: 18,
            stiffness: 150,
        });
    }, [visualIndex, tabWidth]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorPosition.value }],
    }));

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom, backgroundColor: bgColor, borderTopColor: borderColor }]}>
            {/* Indicador Animado de Fondo */}
            <Animated.View style={[
                styles.indicator,
                { width: tabWidth },
                indicatorStyle
            ]}>
                <View style={[styles.indicatorInner, { backgroundColor: 'rgba(139, 92, 246, 0.08)' }]} />
            </Animated.View>

            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];

                // Expo Router's href: null oculta el tab
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
                            isFocused && !isCenter ? styles.activeIconBg : null,
                            isCenter && isFocused ? styles.activeCenterIconBg : null,
                            isCenter ? styles.centerTab : null
                        ]}>
                            {options.tabBarIcon && options.tabBarIcon({
                                focused: isFocused,
                                color: isFocused ? activeTintColor : inactiveTintColor,
                                size: isCenter ? 26 : 22,
                            })}
                        </View>

                        {/* Solo mostrar etiqueta si no es el tab central */}
                        {!isCenter && label !== 'Inicio' && (
                            <Text style={[styles.tabLabel, { color: isFocused ? activeTintColor : inactiveTintColor }]}>
                                {label as string}
                            </Text>
                        )}
                    </Pressable>
                );
            })}
        </View>
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
