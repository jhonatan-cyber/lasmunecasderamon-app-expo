import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BASE_URL } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

interface Props {
  avatarIcon: string;
  formData: any;
  accentColor: string;
  textPrimary: string;
  onEditPhoto: () => void;
}

export function ProfileAvatar({ avatarIcon, formData, accentColor, textPrimary, onEditPhoto }: Props) {
  const user = useAuthStore((state) => state.user);

  return (
    <View style={styles.profileHero}>
      <View style={[styles.avatarBorder, { borderColor: accentColor }]}>
        {formData.image || user?.foto ? (
          <Image
            source={{
              uri: formData.image
                ? formData.image
                : user?.foto?.startsWith("http")
                  ? user.foto
                  : `${BASE_URL}/api/images/users/${user?.foto}`,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name={avatarIcon as any} size={56} color={accentColor} />
          </View>
        )}
        <Pressable style={[styles.editPhotoBadge, { backgroundColor: accentColor, borderColor: textPrimary === "#FFFFFF" ? "#000" : "#FFF" }]} onPress={onEditPhoto}>
          <Ionicons name="camera" size={16} color="#FFF" />
        </Pressable>
      </View>
      <Text style={[styles.userName, { color: textPrimary }]}>
        {user?.name} {user?.lastName}
      </Text>
      <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
        <Text style={[styles.roleText, { color: accentColor }]}>
          {user?.role?.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHero: { alignItems: "center", paddingVertical: 32 },
  avatarBorder: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, padding: 4, position: "relative" },
  avatar: { width: "100%", height: "100%", borderRadius: 60 },
  avatarPlaceholder: { width: "100%", height: "100%", borderRadius: 60, justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
  editPhotoBadge: { position: "absolute", bottom: 5, right: 5, width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#000" },
  userName: { fontSize: 24, fontWeight: "900", marginTop: 16, letterSpacing: -0.5 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  roleText: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
});
