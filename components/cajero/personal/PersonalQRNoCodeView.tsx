import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface PersonalQRNoCodeViewProps {
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const PersonalQRNoCodeView: React.FC<PersonalQRNoCodeViewProps> = ({
  accentColor,
  textPrimary,
  textSecondary,
  isGenerating,
  onGenerate,
}) => (
  <View style={styles.container}>
    <View style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}>
      <Ionicons name="qr-code-outline" size={56} color={accentColor} />
    </View>
    <Text style={[styles.title, { color: textPrimary }]}>Sin Código QR</Text>
    <Text style={[styles.text, { color: textSecondary }]}>
      Este usuario no tiene un código de asistencia asignado
    </Text>
    <Pressable
      style={[styles.generateBtn, { backgroundColor: accentColor }]}
      onPress={onGenerate}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <>
          <Ionicons name="qr-code-outline" size={20} color="white" />
          <Text style={styles.generateBtnText}>Generar Código QR</Text>
        </>
      )}
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    height: 54,
    borderRadius: 9999,
    gap: 10,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  generateBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
