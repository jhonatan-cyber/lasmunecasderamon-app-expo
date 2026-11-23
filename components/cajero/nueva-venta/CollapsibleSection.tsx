import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { haptic } from '@/utils/haptics';

interface CollapsibleSectionProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
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
  fontFamily = FontFamily.bold,
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
        <Text style={[styles.title, { color: textPrimary, fontSize, fontFamily }]}>
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
    fontFamily: FontFamily.bold,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
