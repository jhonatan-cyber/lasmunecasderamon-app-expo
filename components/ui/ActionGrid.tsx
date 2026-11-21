import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BloqueoPorCaja } from '@/components/shared/BloqueoPorCaja';
import {
  DashboardActionCard,
  type DashboardCardVariant,
} from '@/components/shared/DashboardActionCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';

export interface ActionGridItem {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  borderColor?: string;
  route?: string;
  onPress?: () => void;
  disabled?: boolean;
  bloqueoPorCaja?: boolean;
  /** Contador que se muestra como pastilla sobre la tarjeta. */
  badge?: number;
  /** Cómo se anuncia el contador a lectores de pantalla. */
  badgeLabel?: string;
  /** Variante de la tarjeta; por defecto usa la del grid. */
  variant?: DashboardCardVariant;
}

export interface ActionGridProps {
  actions: ActionGridItem[];
  /**
   * `tile` (por defecto) dibuja el cuadro vertical del dashboard. `row` mantiene
   * la fila compacta para los bloques que acompañan a otros datos.
   */
  variant?: DashboardCardVariant;
  /** Fuerza el número de columnas; por defecto 2 en móvil y 3 en tablet/horizontal. */
  columns?: number;
  /** Desactiva la animación de entrada escalonada. */
  disableEntranceAnimation?: boolean;
  /** Layout bento: la primera card ocupa todo el ancho y las demás siguen el grid. */
  bentoLayout?: boolean;
}

interface AnimatedActionCardProps {
  action: ActionGridItem;
  index: number;
  variant: DashboardCardVariant;
  reducedMotion: boolean;
  disableEntranceAnimation: boolean;
  onPress: (action: ActionGridItem) => void;
}

function AnimatedActionCard({ action, index, variant, reducedMotion, disableEntranceAnimation, onPress }: AnimatedActionCardProps) {
  const scale = useSharedValue(reducedMotion || disableEntranceAnimation ? 1 : 0);
  const opacity = useSharedValue(reducedMotion || disableEntranceAnimation ? 1 : 0);

  if (!(reducedMotion || disableEntranceAnimation)) {
    const delay = index * 80;
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const card = (
    <DashboardActionCard
      title={action.title}
      description={action.description}
      icon={action.icon}
      color={action.color}
      borderColor={action.borderColor}
      onPress={() => onPress(action)}
      disabled={action.disabled}
      variant={action.variant ?? variant}
      badge={action.badge}
      badgeLabel={action.badgeLabel}
      bloqueado={!!action.bloqueoPorCaja}
    />
  );

  return (
    <Animated.View style={animatedStyle}>
      {action.bloqueoPorCaja ? (
        <BloqueoPorCaja bloqueado style={styles.cell}>
          {card}
        </BloqueoPorCaja>
      ) : card}
    </Animated.View>
  );
}

const ROW_GAP = 12;
const TOP_GAP = 15;

/**
 * Tablero de acciones del dashboard: dos columnas en móvil y tres cuando hay
 * ancho de sobra (tablet o landscape), con tarjetas DashboardActionCard y
 * separación uniforme.
 */
export const ActionGrid: React.FC<ActionGridProps> = ({
  actions,
  variant = 'tile',
  columns,
  disableEntranceAnimation = false,
  bentoLayout = false,
}) => {
  const router = useRouter();
  const { isTablet, isLandscape } = useResponsiveMetrics();
  const reducedMotion = useReducedMotion();

  const columnCount =
    columns ??
    (variant === 'row' ? 2 : isTablet || isLandscape ? 3 : 2);

  const bentoFeatured = bentoLayout ? actions[0] : null;
  const bentoRemaining = bentoLayout ? actions.slice(1) : actions;

  const rows: ActionGridItem[][] = [];
  for (let i = 0; i < bentoRemaining.length; i += columnCount) {
    rows.push(bentoRemaining.slice(i, i + columnCount));
  }

  const handlePress = (action: ActionGridItem) => {
    if (action.onPress) {
      action.onPress();
    } else if (action.route) {
      router.push(action.route as Href);
    }
  };

  return (
    <View>
      {bentoFeatured && (
        <View style={[styles.row, { marginTop: TOP_GAP }]}>
          <View style={styles.cell}>
            <AnimatedActionCard
              action={bentoFeatured}
              index={0}
              variant={variant}
              reducedMotion={reducedMotion}
              disableEntranceAnimation={disableEntranceAnimation}
              onPress={handlePress}
            />
          </View>
        </View>
      )}
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            { marginTop: bentoLayout ? ROW_GAP : rowIndex === 0 ? TOP_GAP : ROW_GAP, gap: ROW_GAP },
          ]}
        >
          {row.map((action, colIndex) => {
            const globalIndex = (bentoLayout ? 1 : 0) + rowIndex * columnCount + colIndex;
            return (
              <View key={action.title} style={styles.cell}>
                <AnimatedActionCard
                  action={action}
                  index={globalIndex}
                  variant={variant}
                  reducedMotion={reducedMotion}
                  disableEntranceAnimation={disableEntranceAnimation}
                  onPress={handlePress}
                />
              </View>
            );
          })}
          {row.length < columnCount &&
            Array.from({ length: columnCount - row.length }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.cell} />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
  },
});
