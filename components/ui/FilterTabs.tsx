import { Tabs, type TabItem } from '@/components/ui/Tabs';

export type FilterTabItem<T extends string> = TabItem<T>;

type FilterTabsProps<T extends string> = {
  tabs: FilterTabItem<T>[];
  activeKey: T;
  onTabPress: (key: T) => void;
  accentColor: string;
  cardBg: string;
  textSecondary: string;
  borderColor: string;
  /** Text color on active tab; defaults to readable color over accentColor */
  accentText?: string;
  /**
   * `false` disables the slide. By default tabs keep full label width and
   * only slide when they don't fit, stretching evenly when they do.
   */
  scrollable?: boolean;
  /** Center the tabs and let them wrap into extra rows instead of sliding */
  wrap?: boolean;
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
  accentText,
  scrollable,
  wrap,
  leadingChildren,
}: FilterTabsProps<T>) {
  return (
    <Tabs
      variant="pills"
      tabs={tabs}
      activeKey={activeKey}
      onChange={onTabPress}
      accentColor={accentColor}
      accentText={accentText}
      cardBg={cardBg}
      textSecondary={textSecondary}
      borderColor={borderColor}
      scrollable={scrollable}
      wrap={wrap}
      leadingChildren={leadingChildren}
    />
  );
}
