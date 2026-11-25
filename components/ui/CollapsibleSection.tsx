import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import { FontFamily } from '@/constants/fonts';
import { haptic } from '@/utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CollapsibleSectionProps {
  title: string;
  /** Controlado. Si se omite, se usa `defaultCollapsed` internamente. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  padding?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  headerRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accentColor: string;
  accentOnSurface: string;
  textPrimary: string;
  borderColor: string;
  cardBg: string;
}

/**
 * Sección colapsable compartida: header con icono/título/chevron y contenido
 * condicional. Antes vivía en `cajero/nueva-venta` y tenía un clon en servicios.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  collapsed,
  defaultCollapsed = false,
  onToggle,
  children,
  fontSize = 15,
  fontFamily = FontFamily.bold,
  borderRadius = 16,
  padding = 14,
  icon,
  iconColor,
  headerRight,
  style,
  headerStyle,
  contentStyle,
  accentColor,
  accentOnSurface,
  textPrimary,
  borderColor,
  cardBg,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = collapsed !== undefined;
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  const handleToggle = () => {
    haptic.tap();
    if (Platform.OS !== 'web') LayoutAnimation.easeInEaseOut();
    if (!isControlled) setInternalCollapsed((prev) => !prev);
    onToggle?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor,
          borderRadius,
        },
        style,
      ]}
    >
      <Pressable
        onPress={handleToggle}
        style={[styles.header, { padding }, headerStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${isCollapsed ? 'Expandir' : 'Colapsar'} ${title}`}
        accessibilityState={{ expanded: !isCollapsed }}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={iconColor ?? accentOnSurface}
              style={styles.icon}
            />
          )}
          <Text style={[styles.title, { color: textPrimary, fontSize, fontFamily }]}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {headerRight}
          <Ionicons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={accentOnSurface}
          />
        </View>
      </Pressable>
      {!isCollapsed && (
        <View
          style={[
            styles.content,
            { paddingHorizontal: padding, paddingBottom: padding },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  icon: { flexShrink: 0 },
  title: {
    flexShrink: 1,
  },
  content: {},
});
