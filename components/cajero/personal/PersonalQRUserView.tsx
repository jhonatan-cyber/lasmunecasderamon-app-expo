import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import React from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LazyQRCode } from '@/components/ui/LazyQRCode';
import { BASE_URL } from '@/api/client';
import { User } from '@/hooks/usePersonalScreen';
import { useAccentColor } from '@/hooks/useAccentColor';

interface PersonalQRUserViewProps {
  user: User;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  codigoAsistencia: string;
  isGenerating: boolean;
  onGenerateQR: (userId: string) => void;
}

export const PersonalQRUserView: React.FC<PersonalQRUserViewProps> = ({
  user,
  accentColor,
  accentBg,
  borderColor,
  textPrimary,
  textSecondary,
  codigoAsistencia,
  isGenerating,
  onGenerateQR,
}) => {
    const { accentOnSurface } = useAccentColor();
  const { width } = useWindowDimensions();
  // El QR crece con la pantalla pero se limita para no desbordar en tablet o
  // en horizontal.
  const qrSize = Math.min(width - 48, 320);
  const userPhoto = user.foto ? `${BASE_URL}/img/users/${user.foto}` : undefined;

  return (
    <>
      <View style={[styles.userHeader, { borderBottomColor: borderColor }]}>
        <View style={[styles.avatarWrapper, { borderColor: accentColor }]}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accentBg }]}>
              <Text style={[styles.avatarText, { color: accentOnSurface }]}>
                {user.name?.[0]}{user.lastName?.[0]}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.userName, { color: textPrimary }]}>
          {user.name} {user.lastName}
        </Text>
        <Text style={[styles.userNick, { color: accentOnSurface }]}>
          @{user.nick}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.roleText, { color: accentOnSurface }]}>
            {user.role}
          </Text>
        </View>
      </View>

      <View style={styles.qrContainer}>
        <View style={[styles.qrGlow, { backgroundColor: accentColor }]} />
        <LazyQRCode
          value={user.qr_token || ''}
          size={qrSize}
          backgroundColor="white"
          color={accentOnSurface}
          ecl="H"
          logo={userPhoto ? { uri: userPhoto } : undefined}
          logoSize={50}
          logoBorderRadius={25}
          logoBackgroundColor="white"
          logoMargin={4}
        />

        <View style={styles.qrFooter}>
          <Ionicons name="shield-checkmark" size={14} color={accentOnSurface} />
          <Text style={[styles.qrHint, { color: textSecondary, marginTop: 0 }]}>
            Código de un solo uso · vence en 2 minutos
          </Text>
        </View>

        {codigoAsistencia ? (
          <View style={[styles.codigoBadge, { borderColor: accentColor }]}>
            <Text style={[styles.codigoLabel, { color: textSecondary }]}>Código: </Text>
            <Text style={[styles.codigoValue, { color: accentOnSurface }]}>
              {codigoAsistencia}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: `${accentColor}15`, borderColor: accentColor }]}
          onPress={() => onGenerateQR(user.id)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color={accentOnSurface} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color={accentOnSurface} />
              <Text style={[styles.actionBtnText, { color: accentOnSurface }]}>Regenerar</Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  userHeader: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    padding: 3,
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userNick: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  qrGlow: {
    position: 'absolute',
    top: '50%',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.1,
    transform: [{ translateY: -50 }],
  },
  qrHint: {
    marginTop: 20,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  codigoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  codigoLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  codigoValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
