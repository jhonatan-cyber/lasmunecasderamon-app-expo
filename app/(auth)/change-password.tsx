import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccentColor } from "@/hooks/useAccentColor";
import { FontFamily } from "@/constants/fonts";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services";
import { changePasswordSchema } from "@lasmunecasderamon/validations";
import { getHomeRouteByRole } from "@/utils/userRole";
import { showToast } from "@/utils/toast-lazy";

export default function ChangePasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isDark,
    bg,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    accentColor,
    accentText,
    semanticColors,
  } = useAccentColor();

  const clearForcePasswordChange = useAuthStore(
    (state) => state.clearForcePasswordChange
  );

  const handleChangePassword = async () => {
    setError("");

    const parsed = changePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message || "Datos inválidos"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword(parsed.data);
      if (!res.success) {
        throw new Error(res.message || "No se pudo cambiar la contraseña");
      }

      await clearForcePasswordChange();
      showToast({
        type: "success",
        text1: "Contraseña actualizada",
        text2: "Ya puedes continuar con tu sesión",
      });
      const homeRoute = getHomeRouteByRole(useAuthStore.getState().user) ?? '/(auth)/login';
      router.replace(homeRoute);
    } catch (err: any) {
      setError(err.message || "Error al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.inner,
          {
            paddingLeft: 30 + insets.left,
            paddingRight: 30 + insets.right,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Cambiar Contraseña
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Debés cambiar tu contraseña antes de continuar.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <Text style={[styles.errorText, { color: semanticColors.error }]}>
              {error}
            </Text>
          ) : null}

          <View style={styles.passwordField}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  color: textPrimary,
                },
              ]}
              placeholder="Nueva contraseña (mínimo 8 caracteres)"
              placeholderTextColor={textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <Pressable
              style={styles.visibilityButton}
              onPress={() => setShowPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.passwordField}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  color: textPrimary,
                },
              ]}
              placeholder="Confirmar contraseña"
              placeholderTextColor={textSecondary}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
            <Pressable
              style={styles.visibilityButton}
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
              disabled={loading}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: accentColor },
              (loading || !password || !confirmPassword) && { opacity: 0.5 },
              pressed &&
              !(loading || !password || !confirmPassword) && { opacity: 0.8 },
            ]}
            onPress={handleChangePassword}
            disabled={loading || !password || !confirmPassword}
            accessibilityRole="button"
            accessibilityLabel="Guardar nueva contraseña"
            accessibilityState={{ disabled: loading || !password || !confirmPassword }}
          >
            {loading ? (
              <ActivityIndicator color={accentText} />
            ) : (
              <Text
                style={[styles.submitButtonText, { color: accentText }]}
              >
                Guardar y Continuar
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: FontFamily.extrabold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  formContainer: {
    width: "100%",
  },
  errorText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    marginBottom: 20,
    textAlign: "center",
    padding: 10,
    borderRadius: 8,
  },
  passwordField: {
    position: "relative",
    marginBottom: 16,
  },
  visibilityButton: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    height: 60,
    borderRadius: 20,
    paddingLeft: 24,
    paddingRight: 56,
    fontSize: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  submitButton: {
    height: 56,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});
