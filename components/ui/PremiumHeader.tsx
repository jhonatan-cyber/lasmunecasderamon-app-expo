import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { FontFamily } from "@/constants/fonts";
import { haptic } from '@/utils/haptics';
import { BorderRadius } from '@/constants/spacing';

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
}: PremiumHeaderProps) {
    const { gradientColors } = useAccentColor();
    const insets = useSafeAreaInsets();
    const { isTablet, isLandscape } = useResponsiveMetrics();
    // En un móvil horizontal la altura es escasa: el header se compacta.
    const compact = isLandscape && !isTablet;
    const backBtnSize = isTablet ? 44 : 38;

    return (
        <LinearGradient
            colors={gradientColors as unknown as readonly [string, string, ...string[]]}
            style={[
                styles.header,
                {
                    paddingTop: insets.top + (compact ? 4 : isTablet ? 20 : 10),
                    paddingBottom: compact ? 16 : 25,
                    borderBottomLeftRadius: compact ? 24 : 32,
                    borderBottomRightRadius: compact ? 24 : 32,
                }
            ]}
        >
            <View
                pointerEvents="none"
                style={[
                    styles.scrim,
                    {
                        borderBottomLeftRadius: compact ? 24 : 32,
                        borderBottomRightRadius: compact ? 24 : 32,
                    },
                ]}
            />
            <View style={styles.headerTop}>
                <View style={styles.titleBlock}>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        maxFontSizeMultiplier={1.4}
                        style={[styles.headerTitle, { color: '#FFFFFF' }, isTablet && { fontSize: 30 }]}
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
                                style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.92)' }, isTablet && { fontSize: 16 }]}
                            >
                                {connectionStatus ? (connectionStatus.label || (connectionStatus.isConnected ? 'Conectado' : 'Desconectado')) : subtitle}
                            </Text>
                        </View>
                    )}
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                            {breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}> / </Text>}
                                    <Pressable
                                        onPress={crumb.onPress}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Navegar a ${crumb.label}`}
                                    >
                                        <Text style={{
                                            color: i === breadcrumbs.length - 1 ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
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
                            {Array.from({ length: progressSteps.totalSteps }).map((_, i) => (
                                <View
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: 3,
                                        borderRadius: 2,
                                        backgroundColor: i < progressSteps.currentStep
                                            ? '#FFFFFF'
                                            : 'rgba(255,255,255,0.25)',
                                    }}
                                />
                            ))}
                            <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 12, fontFamily: FontFamily.semibold }}>
                                {progressSteps.currentStep}/{progressSteps.totalSteps}
                            </Text>
                        </View>
                    )}
                </View>
                {rightComponent}
                {showAddButton && (
                    <Pressable
                        onPress={onAdd}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar nuevo"
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={[styles.plusBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    >
                        <Ionicons name="add" size={isTablet ? 24 : 20} color="#FFFFFF" />
                        <Text style={[styles.plusBtnText, isTablet && { fontSize: 18 }]}>Nuevo</Text>
                    </Pressable>
                )}
                {onBack && (
                    <Pressable
                        onPress={onBack}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={[
                            styles.backBtn,
                            { width: backBtnSize, height: backBtnSize, borderRadius: backBtnSize / 2 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Volver atrás"
                    >
                        <Ionicons name="arrow-back" size={isTablet ? 24 : 20} color="#FFFFFF" />
                    </Pressable>
                )}
            </View>

            {tabs && tabs.length > 0 && (
                <View style={[styles.tabContainer, {
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
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
                                style={[styles.tab, isActive && { backgroundColor: 'rgba(0,0,0,0.38)' }]}
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
                                        isActive ? { color: "#FFFFFF" } : { color: "rgba(255,255,255,0.92)" }
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 25 },
    scrim: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.20)',
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleBlock: { flex: 1, alignItems: 'flex-start' },
    backBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    headerTitle: { fontSize: 27, lineHeight: 34, fontFamily: FontFamily.display, letterSpacing: -0.2, textAlign: 'left' },
    headerSubtitle: { fontSize: 14, fontFamily: FontFamily.medium, opacity: 0.85, textAlign: 'left' },
    plusBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.xl, gap: 4 },
    plusBtnText: { color: '#FFFFFF', fontFamily: FontFamily.semibold, fontSize: 14 },
    tabContainer: { flexDirection: 'row', marginTop: 20, borderRadius: BorderRadius.lg, padding: 4, borderWidth: 1 },
    tab: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.md },
    tabText: { fontSize: 14, fontFamily: FontFamily.semibold },
});

