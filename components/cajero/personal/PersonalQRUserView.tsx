import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BASE_URL } from '@/api/client';
import { User } from '@/hooks/usePersonalScreen';

const { width } = Dimensions.get('window');

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
  const userPhoto = user.foto ? `${BASE_URL}/img/users/${user.foto}` : undefined;

  return (
    <>
      <View style={[styles.userHeader, { borderBottomColor: borderColor }]}>
        <View style={[styles.avatarWrapper, { borderColor: accentColor }]}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accentBg }]}>
              <Text style={[styles.avatarText, { color: accentColor }]}>
                {user.name?.[0]}{user.lastName?.[0]}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.userName, { color: textPrimary }]}>
          {user.name} {user.lastName}
        </Text>
        <Text style={[styles.userNick, { color: accentColor }]}>
          @{user.nick}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.roleText, { color: accentColor }]}>
            {user.role}
          </Text>
        </View>
      </View>

      <View style={styles.qrContainer}>
        <View style={[styles.qrGlow, { backgroundColor: accentColor }]} />
        <QRCode
          value={user.qr_token || ''}
          size={width - 48}
          backgroundColor="white"
          color={accentColor}
          ecl="H"
          logo={userPhoto ? { uri: userPhoto } : undefined}
          logoSize={50}
          logoBorderRadius={25}
          logoBackgroundColor="white"
          logoMargin={4}
        />

        <View style={styles.qrFooter}>
          <Ionicons name="shield-checkmark" size={14} color={accentColor} />
          <Text style={[styles.qrHint, { color: textSecondary, marginTop: 0 }]}>
            Token de seguridad personal único
          </Text>
        </View>

        {codigoAsistencia ? (
          <View style={[styles.codigoBadge, { borderColor: accentColor }]}>
            <Text style={[styles.codigoLabel, { color: textSecondary }]}>Código: </Text>
            <Text style={[styles.codigoValue, { color: accentColor }]}>
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
            <ActivityIndicator color={accentColor} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color={accentColor} />
              <Text style={[styles.actionBtnText, { color: accentColor }]}>Regenerar</Text>
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
    borderRadius: 30,
    borderWidth: 3,
    padding: 3,
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
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
    borderRadius: 16,
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
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
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
    borderRadius: 14,
    borderWidth: 1.5,
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
    borderRadius: 9999,
    borderWidth: 1.5,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
