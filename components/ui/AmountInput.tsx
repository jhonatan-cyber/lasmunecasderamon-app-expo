import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface AmountInputProps {
  value: string;
  /** Recibe el texto ya escrito (sin formatear); el caller aplica su formato. */
  onChange: (text: string) => void;
  label?: string;
  placeholder?: string;
  prefix?: string;
  centered?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  fontSize?: number;
  borderRadius?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  placeholderTextColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Campo de monto reutilizable. Reemplaza los tres inputs duplicados en los
 * modales de carga de saldo (clientes, nueva venta y nuevo servicio).
 */
export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '0',
  prefix,
  centered = false,
  autoFocus = false,
  disabled = false,
  fontSize = 24,
  borderRadius = BorderRadius.full,
  height = 60,
  backgroundColor,
  borderColor,
  textColor,
  placeholderTextColor,
  icon,
  iconColor,
  style,
  inputStyle,
}) => {
  const theme = useAccentColor();
  const bg = backgroundColor ?? theme.surfaceMuted;
  const border = borderColor ?? theme.borderColor;
  const color = textColor ?? theme.textPrimary;
  const hint = placeholderTextColor ?? theme.textSecondary;

  return (
    <View style={style}>
      {!!label && (
        <Text
          style={[styles.label, { color: theme.textSecondary }]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: bg,
            borderColor: border,
            borderRadius,
            height,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={iconColor ?? hint}
            style={styles.icon}
          />
        )}
        {!!prefix && <Text style={[styles.prefix, { color: hint }]}>{prefix}</Text>}
        <TextInput
          style={[
            styles.input,
            {
              color,
              fontSize,
              textAlign: centered ? 'center' : 'left',
              fontFamily: FontFamily.extrabold,
            },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={hint}
          keyboardType="numeric"
          autoFocus={autoFocus}
          editable={!disabled}
          accessibilityLabel={label ?? 'Monto a cargar'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontFamily: FontFamily.extrabold,
    marginBottom: 8,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  icon: { marginRight: 10 },
  prefix: { fontSize: FontSize.lg, marginRight: 4 },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
});
