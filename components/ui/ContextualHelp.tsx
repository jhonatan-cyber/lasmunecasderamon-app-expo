import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface ContextualHelpStep {
  title: string;
  description: string;
}

interface ContextualHelpProps {
  title: string;
  steps: ContextualHelpStep[];
}

export function ContextualHelp({ title, steps }: ContextualHelpProps) {
  const { accentColor, accentOnSurface, surfaceMuted, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: surfaceMuted, borderColor }]}>
      <Pressable
        onPress={() => setExpanded(current => !current)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`Ayuda contextual para ${title}`}
        accessibilityHint="Muestra u oculta los pasos recomendados."
        accessibilityState={{ expanded }}
      >
        <Ionicons name="help-circle-outline" size={20} color={accentOnSurface} />
        <Text style={[styles.triggerText, { color: textPrimary }]}>Ayuda para {title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={textSecondary}
        />
      </Pressable>

      {expanded && (
        <View style={[styles.steps, { borderTopColor: borderColor }]}>
          {steps.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={[styles.number, { backgroundColor: `${accentColor}20` }]}>
                <Text style={[styles.numberText, { color: accentOnSurface }]}>{index + 1}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, { color: textPrimary }]}>{step.title}</Text>
                <Text style={[styles.description, { color: textSecondary }]}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    marginBottom: 14,
    overflow: 'hidden',
  },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  steps: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 12,
    fontFamily: FontFamily.extrabold,
  },
  stepCopy: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: FontFamily.extrabold,
  },
  description: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    lineHeight: 20,
    marginTop: 2,
  },
});