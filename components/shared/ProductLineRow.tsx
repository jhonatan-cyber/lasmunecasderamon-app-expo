import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { type ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BASE_URL } from '@/api/client';
import { BorderRadius } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface ProductLineRowProps {
  name: string;
  meta?: (string | undefined | null)[];
  /** Nombre de archivo o URI completa. */
  photo?: string;
  photoUrl?: (photo: string) => string;
  /** Texto del badge, p. ej. `CANT: 2`. Si se omite se usa `quantity`. */
  badge?: string;
  quantity?: number | string;
  unitPrice?: string;
  lineTotal?: string;
  /** Controles propios del módulo (selector de presentación, stepper…). */
  children?: ReactNode;
  photoSize?: number;
  cardBg?: string;
  borderColor?: string;
  textPrimary?: string;
  textSecondary?: string;
  accentColor?: string;
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Fila de producto reutilizable en ventas, pedidos y servicios. */
export const ProductLineRow: React.FC<ProductLineRowProps> = ({
  name,
  meta = [],
  photo,
  photoUrl,
  badge,
  quantity,
  unitPrice,
  lineTotal,
  children,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
  isDark,
  photoSize = 40,
  style,
}) => {
  const theme = useAccentColor();
  const bg = cardBg ?? theme.cardBg;
  const border = borderColor ?? theme.borderColor;
  const primary = textPrimary ?? theme.textPrimary;
  const secondary = textSecondary ?? theme.textSecondary;
  const accent = accentColor ?? theme.accentColor;
  const dark = isDark ?? theme.isDark;
  const badgeText = badge ?? (quantity !== undefined ? `CANT: ${quantity}` : null);

  const uri = photo
    ? photo.startsWith('http')
      ? photo
      : (photoUrl?.(photo) ?? `${BASE_URL}/api/images/products/${encodeURIComponent(photo)}`)
    : null;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }, style]}>
      {(badgeText || unitPrice) && (
        <View style={styles.header}>
          {badgeText ? (
            <View style={[styles.badge, { backgroundColor: `${accent}10` }]}>
              <Text style={[styles.badgeText, { color: theme.accentOnSurface }]}>
                {badgeText}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {!!unitPrice && (
            <Text style={[styles.unitPrice, { color: secondary }]}>{unitPrice}</Text>
          )}
        </View>
      )}

      <View style={styles.infoRow}>
        {uri ? (
          <Image
            source={{ uri }}
            style={[styles.photo, { width: photoSize, height: photoSize }]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.photo,
              { width: photoSize, height: photoSize },
              styles.placeholder,
              { backgroundColor: dark ? '#333' : '#EEE' },
            ]}
          >
            <Ionicons name="cube-outline" size={20} color={secondary} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: primary }]} numberOfLines={2}>
            {name}
          </Text>
          {meta.filter(Boolean).map((line, index) => (
            <Text key={index} style={[styles.meta, { color: secondary }]} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
      </View>

      {children}

      {!!lineTotal && (
        <View style={styles.totalRow}>
          <Text style={[styles.total, { color: primary }]}>{lineTotal}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
  unitPrice: { fontSize: 14, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  photo: { width: 40, height: 40, borderRadius: BorderRadius.full },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 2 },
  totalRow: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 12,
  },
  total: { fontSize: 18, fontWeight: '900' },
});
