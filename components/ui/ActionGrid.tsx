import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { GarzonActionCard } from '@/components/garzon/GarzonActionCard';

export interface ActionGridItem {
  title: string;
  description: string;
  icon: any;
  color: string;
  route?: string;
  onPress?: () => void;
  disabled?: boolean;
  borderColor?: string;
  childrenWrapper?: (child: React.ReactNode) => React.ReactNode;
}

export interface ActionGridProps {
  actions: ActionGridItem[];
  fullWidth?: boolean;
  cols?: number;
}

/**
 * Reusable action grid layout.
 * Unifies CajeroActionGrid and BarmanActionGrid which share the same
 * row-based grid layout with GarzonActionCard items.
 */
export const ActionGrid: React.FC<ActionGridProps> = ({
  actions,
  fullWidth = false,
  cols,
}) => {
  const { accentColor } = useAccentColor();
  const router = useRouter();
  const { isTablet } = useResponsiveMetrics();

  const columnCount = cols ?? (isTablet ? 3 : 2);
  const spacing = isTablet ? 24 : 16;

  const rows: ActionGridItem[][] = [];
  for (let i = 0; i < actions.length; i += columnCount) {
    rows.push(actions.slice(i, i + columnCount));
  }

  const handlePress = (action: ActionGridItem) => {
    if (action.onPress) {
      action.onPress();
    } else if (action.route) {
      router.push(action.route as Href);
    }
  };

  return (
    <View style={[styles.container, { paddingHorizontal: fullWidth ? 0 : spacing }]}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            { marginTop: rowIndex > 0 ? spacing / 2 : 0, gap: spacing / 2 },
          ]}
        >
          {row.map((action) => (
            <View key={action.title} style={{ flex: 1 }}>
              {action.childrenWrapper ? (
                action.childrenWrapper(
                  <GarzonActionCard
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    color={action.color}
                    borderColor={action.borderColor || accentColor}
                    onPress={() => handlePress(action)}
                    disabled={action.disabled}
                  />
                )
              ) : (
                <GarzonActionCard
                  title={action.title}
                  description={action.description}
                  icon={action.icon}
                  color={action.color}
                  borderColor={action.borderColor || accentColor}
                  onPress={() => handlePress(action)}
                  disabled={action.disabled}
                />
              )}
            </View>
          ))}
          {row.length < columnCount &&
            Array.from({ length: columnCount - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1 }} />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
});
