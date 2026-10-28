import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";

interface ProfileHeroProps {
  photoUri: string | null;
  failedPhotoUri: string | null;
  onPhotoError: (uri: string) => void;
  avatarEmoji: string;
  userName: string;
  roleLabel?: string;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  onEditPhoto: () => void;
}

export function ProfileHero({
  photoUri,
  failedPhotoUri,
  onPhotoError,
  avatarEmoji,
  userName,
  roleLabel,
  accentColor,
  cardBg,
  textPrimary,
  onEditPhoto,
}: ProfileHeroProps) {
  return (
    <View style={styles.profileHero}>
      <View style={[styles.avatarBorder, { borderColor: accentColor }]}>
        {photoUri && failedPhotoUri !== photoUri ? (
          <Image
            key={photoUri}
            source={{ uri: photoUri }}
            onError={() => onPhotoError(photoUri)}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[styles.avatarPlaceholder, { backgroundColor: cardBg }]}
          >
            <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
          </View>
        )}
        <Pressable
          style={[
            styles.editPhotoBadge,
            { backgroundColor: accentColor, borderColor: cardBg },
          ]}
          onPress={onEditPhoto}
        >
          <Ionicons name="camera" size={16} color="#FFF" />
        </Pressable>
      </View>
      <Text style={[styles.userName, { color: textPrimary }]}>{userName}</Text>
      <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
        <Text style={[styles.roleText, { color: accentColor }]}>
          {roleLabel}
        </Text>
      </View>
    </View>
  );
}
