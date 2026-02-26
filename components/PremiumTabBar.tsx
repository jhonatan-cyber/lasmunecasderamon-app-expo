import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PremiumTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const insets = useSafeAreaInsets();

    const bgColor = isDark ? '#0F172A' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const activeTintColor = '#8B5CF6';
    const inactiveTintColor = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom, backgroundColor: bgColor, borderTopColor: borderColor }]}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];

                // Expo Router's href: null should hide the tab
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

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };


                const isCenter = route.name === 'index';

                return (
                    <Pressable
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarButtonTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
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

                        {/* Only show label if it's not the center large tab */}
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
