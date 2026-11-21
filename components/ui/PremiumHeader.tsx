import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { FontFamily } from "@/constants/fonts";
import { IconButton } from '@/components/ui/IconButton';
import { haptic } from '@/utils/haptics';
import { BorderRadius } from '@/constants/spacing';
import { useAppearanceStore } from '@/store/appearanceStore';
import { withAlpha } from '@/utils/color';

export interface PremiumHeaderTab {
    id: string;
    label: string;
}

export interface PremiumHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    showAddButton?: boolean;
    onAdd?: () => void;
    tabs?: PremiumHeaderTab[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    rightComponent?: React.ReactNode;
    connectionStatus?: {
        isConnected: boolean;
        label?: string;
    };
    breadcrumbs?: { label: string; onPress?: () => void }[];
    progressSteps?: {
        currentStep: number;
        totalSteps: number;
    };
    showThemeToggle?: boolean;
}

export function PremiumHeader({
    title,
    subtitle,
    onBack,
    showAddButton = false,
    onAdd,
    tabs,
    activeTab,
    onTabChange,
    rightComponent,
    connectionStatus,
    breadcrumbs,
    progressSteps,
    showThemeToggle = true,
}: PremiumHeaderProps) {
    const {
        accentColor,
        accentGlow,
        gradientText,
        gradientTextMuted,
        gradientControlBg,
        gradientControlBorder,
        gradientActiveBg,
        isDark,
    } = useAccentColor();
    const insets = useSafeAreaInsets();
    const { isTablet, isLandscape } = useResponsiveMetrics();
    const reducedMotion = useReducedMotion();
    const { toggleScheme, scheme } = useAppearanceStore();
    // En un móvil horizontal la altura es escasa: el header se compacta.
    const compact = isLandscape && !isTablet;
    // 40 visuales + hitSlop = 44 efectivos en móvil; en tablet entra 44 real.
    const headerIconSize = isTablet ? 44 : 40;

    // Animación de entrada con slide down
    const translateY = useSharedValue(-20);
    const opacity = useSharedValue(0);
    useEffect(() => {
        if (reducedMotion) {
            // Sin animación cuando el usuario prefiere movimiento reducido.
            translateY.value = 0;
            opacity.value = 1;
        } else {
            translateY.value = withTiming(0, { duration: 400 });
            opacity.value = withDelay(100, withTiming(1, { duration: 300 }));
        }
    }, [translateY, opacity, reducedMotion]);

    // Pulso sutil en el botón "Nuevo" (desactivado con reducedMotion)
    const pulseScale = useSharedValue(1);
    useEffect(() => {
        if (showAddButton && !reducedMotion) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.04, { duration: 1200 }),
                    withTiming(1, { duration: 1200 }),
                ),
                -1,
                true,
            );
        } else {
            pulseScale.value = 1;
        }
    }, [showAddButton, pulseScale, reducedMotion]);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const pulseAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <Animated.View
            style={[
                styles.header,
                {
                    backgroundColor: accentColor,
                    boxShadow: accentGlow,
                    paddingTop: insets.top + (compact ? 4 : isTablet ? 20 : 10),
                    paddingBottom: compact ? 16 : 25,
                    borderBottomLeftRadius: compact ? 24 : 32,
                    borderBottomRightRadius: compact ? 24 : 32,
                },
                headerAnimatedStyle,
            ]}
        >
            <View style={styles.headerTop}>
                <View style={styles.titleBlock}>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        maxFontSizeMultiplier={1.4}
                        style={[styles.headerTitle, { color: gradientText }, isTablet && { fontSize: 30 }]}
                    >
                        {title}
                    </Text>
                    {subtitle && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {connectionStatus && (
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: connectionStatus.isConnected ? '#10B981' : '#EF4444',
                                    shadowColor: connectionStatus.isConnected ? '#10B981' : '#EF4444',
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 1,
                                    shadowRadius: 4,
                                    elevation: 4
                                }} />
                            )}
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                maxFontSizeMultiplier={1.4}
                                style={[styles.headerSubtitle, { color: gradientTextMuted }, isTablet && { fontSize: 16 }]}
                            >
                                {connectionStatus ? (connectionStatus.label || (connectionStatus.isConnected ? 'Conectado' : 'Desconectado')) : subtitle}
                            </Text>
                        </View>
                    )}
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                            {breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <Text style={{ color: gradientTextMuted, fontSize: 12 }}> / </Text>}
                                    <Pressable
                                        onPress={crumb.onPress}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Navegar a ${crumb.label}`}
                                    >
                                        <Text style={{
                                            color: i === breadcrumbs.length - 1 ? gradientText : gradientTextMuted,
                                            fontSize: 12,
                                            fontFamily: i === breadcrumbs.length - 1 ? FontFamily.semibold : FontFamily.medium,
                                        }}>
                                            {crumb.label}
                                        </Text>
                                    </Pressable>
                                </React.Fragment>
                            ))}
                        </View>
                    )}
                    {progressSteps && progressSteps.totalSteps > 1 && (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {Array.from({ length: progressSteps.totalSteps }).map((_, i) => {
                                const isActive = i < progressSteps.currentStep;
                                const stepColor = isActive ? gradientText : gradientControlBg;
                                const neonGlow = isDark && isActive ? {
                                    shadowColor: accentColor,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 4,
                                    elevation: 3,
                                } : {};
                                return (
                                    <View
                                        key={i}
                                        style={{
                                            flex: 1,
                                            height: 3,
                                            borderRadius: 2,
                                            backgroundColor: stepColor,
                                            ...neonGlow,
                                        }}
                                    />
                                );
                            })}
                            <Text style={{ color: gradientTextMuted, fontSize: 12, fontFamily: FontFamily.semibold }}>
                                {progressSteps.currentStep}/{progressSteps.totalSteps}
                            </Text>
                        </View>
                    )}
                </View>
                {rightComponent}
                {showAddButton && (
                    <Animated.View style={pulseAnimatedStyle}>
                        <Pressable
                            onPress={onAdd}
                            accessibilityRole="button"
                            accessibilityLabel="Agregar nuevo"
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            style={[styles.plusBtn, { backgroundColor: gradientControlBg }]}
                        >
                            <Ionicons name="add" size={isTablet ? 24 : 20} color={gradientText} />
                            <Text style={[styles.plusBtnText, { color: gradientText }, isTablet && { fontSize: 18 }]}>Nuevo</Text>
                        </Pressable>
                    </Animated.View>
                )}
                {showThemeToggle && (
                    <IconButton
                        icon={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                        accessibilityLabel="Cambiar tema"
                        onPress={toggleScheme}
                        color={gradientText}
                        size={headerIconSize}
                        iconSize={isTablet ? 24 : 20}
                        backgroundColor={gradientControlBg}
                        style={styles.headerIconSpacing}
                    />
                )}
                {onBack && (
                    <IconButton
                        icon="arrow-back"
                        accessibilityLabel="Volver atrás"
                        onPress={onBack}
                        color={gradientText}
                        size={headerIconSize}
                        iconSize={isTablet ? 24 : 20}
                        backgroundColor={gradientControlBg}
                        style={styles.headerIconSpacing}
                    />
                )}
            </View>

            {tabs && tabs.length > 0 && (
                <View style={[styles.tabContainer, {
                    borderColor: gradientControlBorder,
                    backgroundColor: gradientControlBg,
                    height: compact ? 42 : isTablet ? 56 : 48,
                    marginTop: compact ? 10 : 20,
                }]}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <Pressable
                                key={tab.id}
                                accessibilityRole="tab"
                                accessibilityLabel={tab.label}
                                accessibilityState={{ selected: isActive }}
                                style={[styles.tab, isActive && { backgroundColor: gradientActiveBg }]}
                                onPress={() => {
                                    haptic.select();
                                    onTabChange && onTabChange(tab.id);
                                }}
                            >
                                <Text
                                    maxFontSizeMultiplier={1.3}
                                    numberOfLines={1}
                                    style={[
                                        styles.tabText,
                                        isTablet && { fontSize: 16 },
                                        isActive ? { color: gradientText } : { color: gradientTextMuted }
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 25 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleBlock: { flex: 1, alignItems: 'flex-start' },
    headerIconSpacing: { marginLeft: 10 },
    headerTitle: { fontSize: 27, lineHeight: 34, fontFamily: FontFamily.display, letterSpacing: -0.2, textAlign: 'left' },
    headerSubtitle: { fontSize: 14, fontFamily: FontFamily.medium, opacity: 0.85, textAlign: 'left' },
    plusBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, gap: 4 },
    plusBtnText: { color: '#FFFFFF', fontFamily: FontFamily.semibold, fontSize: 14 },
    tabContainer: { flexDirection: 'row', marginTop: 20, borderRadius: BorderRadius.lg, padding: 4, borderWidth: 1 },
    tab: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.md },
    tabText: { fontSize: 14, fontFamily: FontFamily.semibold },
});

