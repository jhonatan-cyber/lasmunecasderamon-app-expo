import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontSize, BorderRadius } from '@/constants/spacing';

export type FilterTabItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type FilterTabsProps<T extends string> = {
  tabs: FilterTabItem<T>[];
  activeKey: T;
  onTabPress: (key: T) => void;
  accentColor: string;
  cardBg: string;
  textSecondary: string;
  borderColor: string;
  /** When true, wraps tabs in a horizontal ScrollView for overflow */
  scrollable?: boolean;
  /** Optional leading children rendered before the tabs (e.g. a date filter button) */
  leadingChildren?: React.ReactNode;
};

export function FilterTabs<T extends string>({
  tabs,
  activeKey,
  onTabPress,
  accentColor,
  cardBg,
  textSecondary,
  borderColor,
  scrollable = false,
  leadingChildren,
}: FilterTabsProps<T>) {
  const renderTab = (tab: FilterTabItem<T>) => {
    const isActive = activeKey === tab.key;
    const displayLabel =
      tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;

    const buttonStyle = scrollable
      ? [styles.filterButton, styles.filterButtonScroll, {
          backgroundColor: isActive ? accentColor : cardBg,
          borderColor: isActive ? accentColor : borderColor,
        }]
      : [styles.filterButton, {
          backgroundColor: isActive ? accentColor : cardBg,
          borderColor: isActive ? accentColor : borderColor,
        }];

    return (
      <Pressable
        key={tab.key}
        style={buttonStyle}
        onPress={() => onTabPress(tab.key)}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar ${tab.label}`}
        accessibilityState={{ selected: isActive }}
      >
        <Text
          style={[
            styles.filterText,
            { color: isActive ? '#FFFFFF' : textSecondary },
          ]}
        >
          {displayLabel}
        </Text>
      </Pressable>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.filterRow}
      >
        {leadingChildren}
        {tabs.map(renderTab)}
      </ScrollView>
    );
  }

  return (
    <View style={styles.filterRow}>
      {leadingChildren}
      {tabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterButtonScroll: {
    flexShrink: 0,
    minWidth: 72,
    paddingHorizontal: 12,
    flex: undefined,
  },
  filterText: {
    fontSize: FontSize.xxs,
    fontWeight: '600',
  },
});
