import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BloqueoPorCaja } from '@/components/shared/BloqueoPorCaja';
import {
  DashboardActionCard,
  type DashboardCardVariant,
} from '@/components/shared/DashboardActionCard';
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
}) => {
  const router = useRouter();
  const { isTablet, isLandscape } = useResponsiveMetrics();

  const columnCount =
    columns ??
    (variant === 'row' ? 2 : isTablet || isLandscape ? 3 : 2);

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

  const renderCard = (action: ActionGridItem) => {
    const card = (
      <DashboardActionCard
        title={action.title}
        description={action.description}
        icon={action.icon}
        color={action.color}
        borderColor={action.borderColor}
        onPress={() => handlePress(action)}
        disabled={action.disabled}
        variant={action.variant ?? variant}
        badge={action.badge}
        badgeLabel={action.badgeLabel}
        bloqueado={!!action.bloqueoPorCaja}
      />
    );
    if (!action.bloqueoPorCaja) return card;
    return (
      <BloqueoPorCaja bloqueado style={styles.cell}>
        {card}
      </BloqueoPorCaja>
    );
  };

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            { marginTop: rowIndex === 0 ? TOP_GAP : ROW_GAP, gap: ROW_GAP },
          ]}
        >
          {row.map((action) => (
            <View key={action.title} style={styles.cell}>
              {renderCard(action)}
            </View>
          ))}
          {/* Rellena la última fila para que las tarjetas conserven el ancho. */}
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
