import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "@/store/authStore";

interface RegistroAsistenciaHeaderProps {
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
}

export const RegistroAsistenciaHeader: React.FC<RegistroAsistenciaHeaderProps> = ({
  accentColor,
  textPrimary,
  textSecondary,
}) => {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <View style={styles.header}>
        <View
          style={[styles.iconCircle, { backgroundColor: `${accentColor}20` }]}
        >
          <Ionicons name="calendar" size={32} color={accentColor} />
        </View>
        <Text style={[styles.title, { color: textPrimary }]}>
          Registrar Asistencia
        </Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Ingresa tu código o escanea el QR para registrar tu asistencia
        </Text>
      </View>

      <View style={styles.userInfo}>
        <View style={[styles.avatarSmall, { backgroundColor: accentColor }]}>
          <Text style={styles.avatarText}>
            {user?.name?.[0]}
            {user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={[styles.userName, { color: textPrimary }]}>
          {user?.name} {user?.lastName}
        </Text>
        <View
          style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}
        >
          <Text style={[styles.roleText, { color: accentColor }]}>
            {user?.role}
          </Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
