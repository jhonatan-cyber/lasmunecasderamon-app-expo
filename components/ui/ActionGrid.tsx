import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BloqueoPorCaja } from '@/components/shared/BloqueoPorCaja';
import { DashboardActionCard } from '@/components/shared/DashboardActionCard';

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
}

export interface ActionGridProps {
  actions: ActionGridItem[];
}

const COLUMNS = 2;
const ROW_GAP = 12;
const TOP_GAP = 15;

/**
 * Tablero de acciones del dashboard con el mismo layout para todos los roles:
 * dos columnas, tarjetas DashboardActionCard y separación uniforme.
 */
export const ActionGrid: React.FC<ActionGridProps> = ({ actions }) => {
  const router = useRouter();

  const rows: ActionGridItem[][] = [];
  for (let i = 0; i < actions.length; i += COLUMNS) {
    rows.push(actions.slice(i, i + COLUMNS));
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
