import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccentColor } from "../hooks/useAccentColor";

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
}: PremiumHeaderProps) {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    return (
        <LinearGradient
            colors={gradientColors as any}
            style={[
                styles.header,
                {
                    paddingTop: insets.top + (isTablet ? 20 : 10),
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                }
            ]}
        >
            <View style={styles.headerTop}>
                {onBack && (
                    <Pressable onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color="#FFFFFF" />
                    </Pressable>
                )}
                <View style={{ flex: 1, marginLeft: onBack ? 10 : 0 }}>
                    <Text style={[styles.headerTitle, { color: '#FFFFFF' }, isTablet && { fontSize: 28 }]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }, isTablet && { fontSize: 17 }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                {rightComponent}
                {showAddButton && (
                    <Pressable
                        onPress={onAdd}
                        style={[styles.plusBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    >
                        <Ionicons name="add" size={isTablet ? 24 : 20} color="#FFFFFF" />
                        <Text style={[styles.plusBtnText, isTablet && { fontSize: 18 }]}>Nuevo</Text>
                    </Pressable>
                )}
            </View>

            {tabs && tabs.length > 0 && (
                <View style={[styles.tabContainer, {
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    height: isTablet ? 56 : 48
                }]}>
                    {tabs.map((tab) => (
                        <Pressable
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && { backgroundColor: accentColor }]}
                            onPress={() => onTabChange && onTabChange(tab.id)}
                        >
                            <Text style={[
                                styles.tabText,
                                isTablet && { fontSize: 16 },
                                activeTab === tab.id ? { color: "#FFF" } : { color: "rgba(255,255,255,0.7)" }
                            ]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 25 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerSubtitle: { fontSize: 15, fontWeight: '500', opacity: 0.8 },
    plusBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 4 },
    plusBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    tabContainer: { flexDirection: 'row', marginTop: 20, borderRadius: 16, padding: 4, borderWidth: 1 },
    tab: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
    tabText: { fontSize: 14, fontWeight: '700' },
});
