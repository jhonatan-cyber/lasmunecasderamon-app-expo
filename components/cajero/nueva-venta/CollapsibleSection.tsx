import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptic } from '@/utils/haptics';

interface CollapsibleSectionProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  fontSize?: number;
  fontWeight?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';
  borderRadius?: number;
  padding?: number;
  style?: any;
  headerStyle?: any;
  contentStyle?: any;
  accentColor: string;
  textPrimary: string;
  borderColor: string;
  cardBg: string;
}

/**
 * Sección colapsable reutilizable con header y contenido.
 * Patrón compartido en nueva-venta.tsx para categorías, detalles, carrito, bebidas y soda.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  collapsed,
  onToggle,
  children,
  fontSize = 15,
  fontWeight = '700',
  borderRadius = 16,
  padding = 14,
  style,
  headerStyle,
  contentStyle,
  accentColor,
  textPrimary,
  borderColor,
  cardBg,
}) => {
  const handleToggle = () => {
    haptic.tap();
    onToggle();
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor, borderWidth: 1, borderRadius }, style]}>
      <Pressable
        onPress={handleToggle}
        style={[styles.header, { padding }, headerStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? 'Expandir' : 'Colapsar'} ${title}`}
      >
        <Text style={[styles.title, { color: textPrimary, fontSize, fontWeight }]}>
          {title}
        </Text>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={accentColor}
        />
      </Pressable>
      {!collapsed && <View style={[styles.content, { paddingHorizontal: padding, paddingBottom: padding }, contentStyle]}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  title: {
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
