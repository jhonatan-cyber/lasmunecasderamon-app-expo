import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';

export interface DashboardActionCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  borderColor?: string;
  onPress: () => void;
  disabled?: boolean;
}

export const DashboardActionCard = ({
  title,
  description,
  icon,
  color,
  borderColor,
  onPress,
  disabled,
}: DashboardActionCardProps) => {
  const { isDark, cardBg, textPrimary, textSecondary } = useAccentColor();
  const { isTablet } = useResponsiveMetrics();

  const iconSize = isTablet ? 38 : 28;
  const fontSize = isTablet ? 22 : FontSize.sm;
  const descSize = isTablet ? 14 : FontSize.xs;
  const minHeight = isTablet ? 160 : 100;
  const padding = isTablet ? 24 : 16;

  return (
    <AnimatedButton
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
      accessibilityHint={disabled ? 'Desactivado' : 'Toque para abrir'}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.cardContainer,
        {
          backgroundColor: disabled
            ? isDark
              ? '#374151'
              : '#F3F4F6'
            : cardBg,
          minHeight,
          padding,
          shadowColor: color,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.32 : 0.16,
          shadowRadius: 20,
          opacity: disabled ? 0.6 : 1,
          borderWidth: 1,
          borderColor: borderColor || color,
        },
      ]}
    >
      <View style={styles.topRow}>
        <LinearGradient
          colors={[`${color}40`, `${color}10`]}
          style={[
            styles.iconBox,
            {
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 20 : 16,
            },
          ]}
        >
          <Ionicons name={icon} size={iconSize} color={color} />
        </LinearGradient>
      </View>

      <View style={styles.infoBox}>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.mainTitle, { fontSize, color: textPrimary }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.subDescription, { fontSize: descSize, color: textSecondary }]}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>

      {!disabled && <View style={[styles.sideIndicator, { backgroundColor: color }]} />}
    </AnimatedButton>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: BorderRadius.xxl,
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    marginTop: 12,
  },
  mainTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subDescription: {
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  sideIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
