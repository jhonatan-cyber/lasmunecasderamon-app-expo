import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { readableTextColor } from '@/utils/color';
import { haptic } from '@/utils/haptics';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius, MIN_TOUCH_TARGET } from '@/constants/spacing';

/** Alto visual del pill; el área táctil se completa con hitSlop hasta 44. */
export const PILL_HEIGHT = 32;
export const PILL_TEXT_SIZE = 12;
const PILL_HIT_SLOP = Math.ceil((MIN_TOUCH_TARGET - PILL_HEIGHT) / 2);

export type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  count?: number;
};

type TabsProps<T extends string> = {
  tabs: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  accentColor: string;
  cardBg: string;
  textSecondary: string;
  borderColor: string;
  /** Text color on active tab; defaults to readable color over accentColor */
  accentText?: string;
  /** `segmented` = tabs principales; `pills` = filtros de estado */
  variant?: 'segmented' | 'pills';
  /**
   * `false` disables the horizontal slide. By default tabs keep their natural
   * width and only slide when they don't fit; if they fit, they stretch evenly
   * like the Asistencia tabs.
   */
  scrollable?: boolean;
  /** Center the tabs and let them wrap into extra rows instead of sliding */
  wrap?: boolean;
  /** Optional content rendered before the first tab (e.g. a date filter) */
  leadingChildren?: ReactNode;
  /** Custom accessibility label, e.g. "Ron, 3 productos" */
  getAccessibilityLabel?: (tab: TabItem<T>) => string;
  isTablet?: boolean;
  style?: StyleProp<ViewStyle>;
};

type RowMeasurement = {
  signature: string;
  viewport: number;
  content: number;
};

export function Tabs<T extends string>({
  tabs,
  activeKey,
  onChange,
  accentColor,
  cardBg,
  textSecondary,
  borderColor,
  accentText,
  variant = 'segmented',
  scrollable,
  wrap = false,
  leadingChildren,
  getAccessibilityLabel,
  isTablet = false,
  style,
}: TabsProps<T>) {
  const activeTextColor = accentText ?? readableTextColor(accentColor);
  const isPills = variant === 'pills';
  const adaptive = scrollable !== false;
  const gap = isTablet ? 10 : 8;

  const signature = tabs
    .map((tab) => `${tab.key}:${tab.label}:${tab.count ?? ''}:${tab.icon ?? ''}`)
    .join('|');
  const [measurement, setMeasurement] = useState<RowMeasurement>({
    signature: '',
    viewport: 0,
    content: 0,
  });

  // Natural widths are only measurable while the row is not forced to stretch,
  // so the slide row is rendered until we know the tabs fit on screen.
  const measured =
    measurement.signature === signature &&
    measurement.viewport > 0 &&
    measurement.content > 0;
  const fits = measured && measurement.content <= measurement.viewport + 0.5;
  const slides = !wrap && adaptive && !fits;
  const stretches = !wrap && !slides && !isPills;

  const updateMeasurement = useCallback(
    (patch: Partial<RowMeasurement>, signatureValue: string) => {
      setMeasurement((prev) => {
        const next: RowMeasurement = {
          signature: patch.signature ?? prev.signature,
          viewport: patch.viewport ?? prev.viewport,
          content: patch.content ?? prev.content,
        };
        if (next.signature !== signatureValue) {
          next.signature = signatureValue;
          next.content = patch.content ?? 0;
        }
        if (
          next.signature === prev.signature &&
          next.viewport === prev.viewport &&
          next.content === prev.content
        ) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  const renderTab = (tab: TabItem<T>) => {
    const isActive = activeKey === tab.key;
    const showPillCount = isPills && tab.count !== undefined;
    const showBadge = !isPills && tab.count !== undefined;

    return (
      <Pressable
        key={tab.key}
        onPress={() => {
          haptic.select();
          onChange(tab.key);
        }}
        accessibilityRole="tab"
        accessibilityLabel={
          getAccessibilityLabel
            ? getAccessibilityLabel(tab)
            : `${tab.label}${tab.count !== undefined ? ` (${tab.count})` : ''}`
        }
        accessibilityState={{ selected: isActive }}
        hitSlop={
          isPills
            ? { top: PILL_HIT_SLOP, bottom: PILL_HIT_SLOP }
            : undefined
        }
        style={[
          isPills ? styles.pill : styles.segment,
          stretches ? styles.tabStretch : styles.tabNatural,
          isTablet && (isPills ? styles.pillTablet : styles.segmentTablet),
          {
            backgroundColor: isActive ? accentColor : cardBg,
            borderColor: isActive ? accentColor : borderColor,
          },
        ]}
      >
        {tab.icon ? (
          <Ionicons
            name={tab.icon}
            size={isPills ? 14 : (isTablet ? 20 : 18)}
            color={isActive ? activeTextColor : textSecondary}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            isPills ? styles.pillText : styles.segmentText,
            isTablet && !isPills && styles.segmentTextTablet,
            { color: isActive ? activeTextColor : textSecondary },
          ]}
        >
          {showPillCount ? `${tab.label} (${tab.count})` : tab.label}
        </Text>
        {showBadge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: isActive ? activeTextColor : accentColor },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isActive ? accentColor : activeTextColor },
              ]}
            >
              {tab.count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (wrap) {
    return (
      <View
        style={[
          styles.row,
          isPills ? styles.pillsRow : styles.segmentedRow,
          styles.wrapRow,
          { gap },
          style,
        ]}
      >
        {leadingChildren}
        {tabs.map(renderTab)}
      </View>
    );
  }

  if (slides) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.row,
          isPills ? styles.pillsRow : styles.segmentedRow,
          styles.scrollRow,
          style,
        ]}
        onLayout={(event) =>
          updateMeasurement(
            { viewport: event.nativeEvent.layout.width },
            signature,
          )
        }
      >
        <View
          style={[styles.scrollContent, { gap }]}
          onLayout={(event) =>
            updateMeasurement(
              { content: event.nativeEvent.layout.width },
              signature,
            )
          }
        >
          {leadingChildren}
          {tabs.map(renderTab)}
        </View>
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isPills ? styles.pillsRow : styles.segmentedRow,
        isPills && styles.rowCentered,
        { gap },
        style,
      ]}
      onLayout={(event) =>
        updateMeasurement(
          { viewport: event.nativeEvent.layout.width, content: measurement.content },
          signature,
        )
      }
    >
      {leadingChildren}
      {tabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  segmentedRow: {
    marginTop: 16,
  },
  pillsRow: {
    marginTop: 16,
    marginBottom: 8,
    minHeight: 40,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  scrollRow: {
    paddingHorizontal: 0,
    flexGrow: 0,
  },
  rowCentered: {
    justifyContent: 'center',
  },
  wrapRow: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tabStretch: {
    flex: 1,
    minWidth: 0,
  },
  tabNatural: {
    flexShrink: 0,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  segmentTablet: {
    paddingVertical: 15,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    minWidth: 72,
    minHeight: PILL_HEIGHT,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pillTablet: {
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pillText: {
    fontSize: PILL_TEXT_SIZE,
    fontFamily: FontFamily.semibold,
  },
  segmentTextTablet: {
    fontSize: 16,
  },
  badge: {
    minWidth: 20,
    minHeight: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
});
