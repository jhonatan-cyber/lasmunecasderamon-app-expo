import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

interface StaffCall {
  id: number | string;
  anfitriona_nick: string;
  roomName: string;
  assistanceType: string;
  message?: string;
}

interface StaffCallCardProps {
  call: StaffCall;
  index: number;
  accepting: number | string | null;
  cardBg: string;
  isDark: boolean;
  accentColor: string;
  onAccept: (id: number | string) => void;
}

export const StaffCallCard: React.FC<StaffCallCardProps> = ({
  call,
  index,
  accepting,
  cardBg,
  isDark,
  accentColor,
  onAccept,
}) => (
  <Animated.View
    entering={FadeInUp}
    exiting={FadeOutUp}
    style={[styles.card, { backgroundColor: cardBg, borderColor: '#E11D48', zIndex: 1000 - index }]}
  >
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>
        <Ionicons name="notifications" size={20} color="#E11D48" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>
          SOLICITUD DE PERSONAL
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {call.anfitriona_nick} • {call.roomName !== 'N/A' ? `Hab: ${call.roomName}` : 'Salón'}
        </Text>
      </View>
    </View>

    <Text style={[styles.typeText, { color: isDark ? '#FFF' : '#333' }]}>
      {call.assistanceType}{call.message ? `: ${call.message}` : ''}
    </Text>

    <Pressable
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: accentColor, opacity: (pressed || accepting === call.id) ? 0.7 : 1 },
      ]}
      onPress={() => onAccept(call.id)}
      disabled={accepting !== null}
    >
      {accepting === call.id ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Text style={styles.btnText}>ACEPTAR Y ATENDER</Text>
      )}
    </Pressable>
  </Animated.View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E11D4820',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 8,
  },
  btn: {
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
