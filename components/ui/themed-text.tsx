import { StyleSheet, Text, type TextProps } from 'react-native';
import { FontFamily, TabularNumbers } from '@/constants/fonts';
import { FontSize } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'medium' | 'subtitle' | 'caption' | 'number' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const { isDark, textPrimary, textSecondary, accentColor } = useAccentColor();

  const color = lightColor && darkColor
    ? (isDark ? darkColor : lightColor)
    : type === 'caption'
      ? textSecondary
      : type === 'link'
        ? accentColor
        : textPrimary;

  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[
        { color },
        type === 'default' && styles.default,
        type === 'medium' && styles.medium,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'title' && styles.title,
        type === 'caption' && styles.caption,
        type === 'number' && styles.number,
        type === 'link' && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  medium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  defaultSemiBold: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    lineHeight: 26,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    lineHeight: 32,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  number: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    ...TabularNumbers,
  },
  link: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
});


