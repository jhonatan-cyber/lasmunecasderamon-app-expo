import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface PremiumHeaderTab {
    id: string;
    label: string;
}

export interface PremiumHeaderProps {
    title: string;
    onBack: () => void;
    showAddButton?: boolean;
    onAdd?: () => void;
    tabs?: PremiumHeaderTab[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    rightComponent?: React.ReactNode;
}

export function PremiumHeader({
    title,
    onBack,
    showAddButton = false,
    onAdd,
    tabs,
    activeTab,
    onTabChange,
    rightComponent,
}: PremiumHeaderProps) {
    const isDark = (useColorScheme() ?? "dark") === "dark";
    const insets = useSafeAreaInsets();

    const textPrimary = isDark ? "#FFFFFF" : "#000000";
    const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
    const headerBg = isDark ? "#111827" : "#FFFFFF";

    return (
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: headerBg }]}>
            <View style={styles.headerTop}>
                <Pressable
                    onPress={onBack}
                    style={styles.backBtn}
                    accessibilityLabel="Volver"
                    accessibilityRole="button"
                >
                    <Ionicons name="arrow-back" size={24} color={textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textPrimary, marginLeft: 15 }]}>{title}</Text>

                {showAddButton && !rightComponent && (
                    <Pressable
                        onPress={onAdd}
                        style={styles.plusBtn}
                        accessibilityLabel="Agregar Nuevo"
                        accessibilityRole="button"
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.plusBtnText}>Nuevo</Text>
                    </Pressable>
                )}

                {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
            </View>

            {tabs && tabs.length > 0 && onTabChange && (
                <View style={styles.tabContainer}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <Pressable
                                key={tab.id}
                                style={[styles.tab, isActive && { backgroundColor: "#E11D48" }]}
                                onPress={() => onTabChange(tab.id)}
                                accessibilityRole="button"
                            >
                                <Text style={[styles.tabText, { color: isActive ? "#FFF" : textSecondary }]}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "900",
    },
    plusBtn: {
        flexDirection: "row",
        backgroundColor: "#E11D48",
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: "auto",
        gap: 6,
    },
    plusBtnText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    rightComponent: {
        marginLeft: "auto",
    },
    tabContainer: {
        flexDirection: "row",
        marginTop: 20,
        backgroundColor: "rgba(155,155,155,0.1)",
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 10,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "700",
    },
});
