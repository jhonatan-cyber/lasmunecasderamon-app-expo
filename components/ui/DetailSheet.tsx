import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { haptic } from '@/utils/haptics';

export interface DetailSheetAction {
  label: string;
  onPress: () => void;
  primary?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
}

export interface DetailSheetSection {
  title?: string;
  rows?: {
    icon?: keyof typeof Ionicons.glyphMap;
    label: string;
    value: React.ReactNode;
  }[];
  content?: React.ReactNode;
}

export interface DetailSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  code?: string;
  subtitle?: string;
  status?: { label: string; color: string };
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  onRetry?: () => void;
  height?: number | string;
  maxWidth?: number;
  /** Contenido del propio módulo (secciones propias, fotos, distribuciones…). */
  children?: React.ReactNode;
  sections?: DetailSheetSection[];
  footerActions?: DetailSheetAction[];
  accessibilityLabel?: string;
  refreshControl?: React.ReactElement;
}

/**
 * Modal de detalle compartido: header (título/código/estado/cerrar), cuerpo
 * desplazable y pie de acciones. Unifica ventas, pedidos, servicios y clientes.
 */
export const DetailSheet: React.FC<DetailSheetProps> = ({
  visible,
  onClose,
  title,
  code,
  subtitle,
  status,
  loading = false,
  loadingLabel = 'Cargando…',
  error,
  onRetry,
  height = '85%',
  maxWidth = 720,
  children,
  sections,
  footerActions,
  accessibilityLabel,
  refreshControl,
}) => {
  const {
    accentColor,
    accentOnSurface,
    accentText,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    surfaceMuted,
  } = useAccentColor();
  const insets = useSafeAreaInsets();

  const actions: DetailSheetAction[] = footerActions?.length
    ? footerActions
    : [{ label: 'Cerrar', onPress: onClose }];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar detalle"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: cardBg,
              borderColor,
              height,
              maxWidth,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel ?? title}
        >
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
                {title}
              </Text>
              {!!code && (
                <Text style={[styles.code, { color: textSecondary }]} numberOfLines={1}>
                  {code}
                </Text>
              )}
              {!!subtitle && (
                <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={2}>
                  {subtitle}
                </Text>
              )}
              {status && (
                <StatusBadge
                  label={status.label}
                  color={status.color}
                  dot
                  style={{ marginTop: 6 }}
                />
              )}
            </View>
            <Pressable
              onPress={() => {
                haptic.tap();
                onClose();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle"
              style={({ pressed }) => pressed && styles.closePressed}
            >
              <Ionicons name="close" size={24} color={textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {loading ? (
              <View style={styles.state}>
                <ActivityIndicator size="large" color={accentOnSurface} />
                <Text style={[styles.stateText, { color: textSecondary }]}>
                  {loadingLabel}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.state}>
                <Ionicons name="cloud-offline-outline" size={32} color={textSecondary} />
                <Text style={[styles.stateText, { color: textSecondary }]}>{error}</Text>
                {onRetry && (
                  <Pressable
                    onPress={onRetry}
                    accessibilityRole="button"
                    accessibilityLabel="Reintentar"
                    style={[styles.retry, { borderColor }]}
                  >
                    <Text style={{ color: accentOnSurface, fontFamily: FontFamily.bold }}>
                      Reintentar
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                {sections?.map((section, index) => (
                  <View key={section.title ?? index} style={styles.section}>
                    {!!section.title && (
                      <Text style={[styles.sectionTitle, { color: textSecondary }]}>
                        {section.title}
                      </Text>
                    )}
                    {section.rows?.map((row, rowIndex) => (
                      <View key={`${row.label}-${rowIndex}`} style={styles.row}>
                        <Text style={[styles.rowLabel, { color: textSecondary }]}>
                          {row.label}
                        </Text>
                        <View style={styles.rowValue}>{row.value}</View>
                      </View>
                    ))}
                    {section.content}
                  </View>
                ))}
                {children}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {actions.map((action, index) => {
              const isPrimary = action.primary ?? index === 0;
              return (
                <Pressable
                  key={`${action.label}-${index}`}
                  onPress={() => {
                    if (action.disabled || action.loading) return;
                    haptic.tap();
                    action.onPress();
                  }}
                  disabled={action.disabled || action.loading}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityState={{ disabled: !!action.disabled }}
                  style={[
                    styles.action,
                    isPrimary
                      ? { backgroundColor: action.disabled ? surfaceMuted : accentColor }
                      : { backgroundColor: surfaceMuted, borderColor },
                    (action.disabled || action.loading) && styles.actionDisabled,
                  ]}
                >
                  {action.loading ? (
                    <ActivityIndicator size="small" color={isPrimary ? accentText : textPrimary} />
                  ) : (
                    <>
                      {action.icon && (
                        <Ionicons
                          name={action.icon}
                          size={16}
                          color={isPrimary ? accentText : textPrimary}
                        />
                      )}
                      <Text
                        style={[
                          styles.actionText,
                          { color: isPrimary ? accentText : textPrimary },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
  },
  closePressed: { opacity: 0.6 },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.black },
  code: { fontSize: FontSize.xs, fontFamily: FontFamily.semibold, marginTop: 3 },
  subtitle: { fontSize: FontSize.xs, marginTop: 3 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 24, paddingBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(155,155,155,0.15)',
  },
  rowLabel: { fontSize: FontSize.xs, flexShrink: 1 },
  rowValue: { flexShrink: 1, maxWidth: '60%' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  stateText: { fontSize: FontSize.sm, textAlign: 'center' },
  retry: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 12 },
  action: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionDisabled: { opacity: 0.5 },
  actionText: { fontSize: FontSize.sm, fontFamily: FontFamily.black },
});
