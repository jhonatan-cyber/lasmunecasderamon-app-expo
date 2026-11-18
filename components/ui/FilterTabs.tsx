import { Tabs, type TabItem } from '@/components/ui/Tabs';

export type FilterTabItem<T extends string> = TabItem<T>;

/**
 * Etiqueta especial para el tab de filtro de fechas.
 * Cuando un tab tiene esta key, `onDateFilterPress` se invoca en lugar de `onTabPress`.
 */
const DATE_FILTER_KEY = 'dateFilter';

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
  /**
   * Si se proporciona, agrega automáticamente un tab de filtro de fechas
   * con icono `calendar-outline` al final de la lista de tabs.
   * El tab no cambia el filtro activo; en su lugar, invoca `onDateFilterPress`.
   */
  dateFilterLabel?: string;
  /** Se invoca cuando se presiona el tab de filtro de fechas. */
  onDateFilterPress?: () => void;
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
  dateFilterLabel,
  onDateFilterPress,
}: FilterTabsProps<T>) {
  // Construir la lista de tabs con el tab de fechas opcional
  const allTabs: (FilterTabItem<T> | FilterTabItem<typeof DATE_FILTER_KEY>)[] = [
    ...tabs,
    ...(dateFilterLabel && onDateFilterPress
      ? [{ key: DATE_FILTER_KEY as T, label: dateFilterLabel, icon: 'calendar-outline' as any }]
      : []),
  ];

  const handleTabPress = (key: T) => {
    if (key === DATE_FILTER_KEY as T) {
      onDateFilterPress?.();
    } else {
      onTabPress(key);
    }
  };

  return (
    <Tabs
      variant="pills"
      tabs={allTabs as FilterTabItem<T>[] as TabItem<T>[]}
      activeKey={activeKey}
      onChange={handleTabPress}
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
