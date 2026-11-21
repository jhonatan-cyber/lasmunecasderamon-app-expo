import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppearanceStore } from "@/store/appearanceStore";
import { DEFAULT_ACCENT_COLOR, normalizeAccentColor, useThemeStore } from "@/store/themeStore";
import { AnimatedScreen } from "@/components/ui/AnimatedScreen";
import { QRScannerModal } from "@/components/shared/QRScannerModal";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import useLogin from "@/hooks/useLogin";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoginForm from "@/components/auth/LoginForm";
import ResetPasswordModal from "@/components/auth/ResetPasswordModal";
import logger from "@/utils/logger";

export default function LoginScreen() {
  const {
    username,
    setUsername,
    password,
    setPassword,
    resetRun,
    setResetRun,
    showPassword,
    setShowPassword,
    error,
    loading,
    showQRScanner,
    setShowQRScanner,
    showResetPasswordModal,
    setShowResetPasswordModal,
    passwordRef,
    isBiometricSupported,
    isBiometricEnabled,
    rememberMe,
    setRememberMe,
    alertConfig,
    closeAlert,
    onAlertConfirm,
    handleResetPassword,
    handleLogin,
    handleQRScan,
    handleBiometricLogin,
    closeResetPasswordModal,
  } = useLogin();

  const colorScheme = useColorScheme() ?? "dark";
  const isDark = colorScheme === "dark";
  const { isLandscape } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();

  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const C = theme;
  const { toggleScheme } = useAppearanceStore();
  const userColors = useThemeStore(state => state.userColors);

  // Obtener el último color de acento guardado, o el default si no hay ninguno.
  // Se normaliza para que un color de una paleta anterior caiga en la neón.
  const lastAccentColor = normalizeAccentColor(Object.values(userColors).pop() || DEFAULT_ACCENT_COLOR);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "android") {
        import("expo-navigation-bar").then((NavigationBar) => {
          try {
            const setButtonStyleAsync = (NavigationBar as any)
              .setButtonStyleAsync;
            if (typeof setButtonStyleAsync === "function") {
              void setButtonStyleAsync(isDark ? "light" : "dark");
            }
          } catch (error) {
            logger.warn("Failed to update navigation bar button style on login screen", { error });
          }
        }).catch(() => {
          // expo-navigation-bar no disponible
        });
      }
    }, [isDark]),
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/login_bg.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {isDark && (
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.75)", "#000000"]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              styles.inner,
              isLandscape && { paddingTop: 16, paddingBottom: 24 },
              {
                paddingLeft: 25 + insets.left,
                paddingRight: 25 + insets.right,
                paddingBottom: (isLandscape ? 24 : 60) + insets.bottom,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1 }}>
              <AnimatedScreen delay={100}>
                <StatusBar style={isDark ? "light" : "dark"} />

                <LoginForm
                  username={username}
                  password={password}
                  showPassword={showPassword}
                  error={error}
                  loading={loading}
                  isDark={isDark}
                  accentColor={lastAccentColor}
                  isBiometricEnabled={isBiometricEnabled}
                  isBiometricSupported={isBiometricSupported}
                  rememberMe={rememberMe}
                  passwordRef={passwordRef}
                  onUsernameChange={setUsername}
                  onPasswordChange={setPassword}
                  onTogglePasswordVisibility={() =>
                    setShowPassword(!showPassword)
                  }
                  onLogin={handleLogin}
                  onQRPress={() => setShowQRScanner(true)}
                  onBiometricPress={handleBiometricLogin}
                  onForgotPassword={() => setShowResetPasswordModal(true)}
                  onRememberMeChange={setRememberMe}
                />
              </AnimatedScreen>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>

      {/* Theme toggle: esquina superior derecha, fija sobre el fondo */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        hitSlop={8}
        style={({ pressed }) => [
          styles.themeToggle,
          {
            top: insets.top + 12,
            right: insets.right + 16,
            backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)",
            borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)",
            opacity: pressed ? 0.6 : 1,
          },
        ]}
        onPress={toggleScheme}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={22}
          color={C.textSecondary}
        />
      </Pressable>

      {/* Reusable Premium Alert Modal */}
      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={onAlertConfirm}
        onCancel={closeAlert}
        showCancel={alertConfig.showCancel}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        visible={showResetPasswordModal}
        loading={loading}
        resetRun={resetRun}
        onChangeResetRun={setResetRun}
        isDark={isDark}
        accentColor={lastAccentColor}
        onClose={closeResetPasswordModal}
        onReset={handleResetPassword}
      />

      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanned={handleQRScan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 60,
  },
  themeToggle: {
    position: "absolute",
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
