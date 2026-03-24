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
import { useAccentColor } from "@/hooks/useAccentColor";

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
}: PremiumHeaderProps) {
    const { accentColor, gradientColors } = useAccentColor();
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
                        <Ionicons name="arrow-back" size={isTablet ? 26 : 22} color="#FFFFFF" />
                        <Text style={[styles.backText, isTablet && { fontSize: 18 }]}>Atrás</Text>
                    </Pressable>
                )}
                <View style={{ flex: 1, marginLeft: onBack ? 12 : 0 }}>
                    <Text style={[styles.headerTitle, { color: '#FFFFFF' }, isTablet && { fontSize: 28 }]}>
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
                            <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }, isTablet && { fontSize: 17 }]}>
                                {connectionStatus ? (connectionStatus.label || (connectionStatus.isConnected ? 'Conectado' : 'Desconectado')) : subtitle}
                            </Text>
                        </View>
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
    backBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingRight: 12, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingLeft: 8,
        gap: 4
    },
    backText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerSubtitle: { fontSize: 15, fontWeight: '500', opacity: 0.8 },
    plusBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 4 },
    plusBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    tabContainer: { flexDirection: 'row', marginTop: 20, borderRadius: 16, padding: 4, borderWidth: 1 },
    tab: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
    tabText: { fontSize: 14, fontWeight: '700' },
});

