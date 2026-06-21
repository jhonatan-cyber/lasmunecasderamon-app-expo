import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import {
  Appearance,
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
import { AnimatedScreen } from "@/components/ui/AnimatedScreen";
import { QRScannerModal } from "@/components/shared/QRScannerModal";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import useLogin from "@/hooks/useLogin";
import LoginForm from "@/components/auth/LoginForm";
import ResetPasswordModal from "@/components/auth/ResetPasswordModal";

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

  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const C = theme;

  const toggleTheme = () => {
    Appearance.setColorScheme(isDark ? "light" : "dark");
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "android") {
        try {
          const setButtonStyleAsync = (NavigationBar as any)
            .setButtonStyleAsync;
          if (typeof setButtonStyleAsync === "function") {
            void setButtonStyleAsync(isDark ? "light" : "dark");
          }
        } catch (error) {
          console.warn(
            "Failed to update navigation bar button style on login screen",
            error,
          );
        }
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
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.6)", "rgba(0,0,0,0.85)", "#000000"]
              : ["rgba(255,255,255,0.4)", "rgba(255,255,255,0.8)", "#FFFFFF"]
          }
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.inner}
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
                  isBiometricEnabled={isBiometricEnabled}
                  isBiometricSupported={isBiometricSupported}
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
                />

                {/* Theme toggle */}
                <Pressable
                  style={({ pressed }) => [
                    styles.themeToggle,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={toggleTheme}
                >
                  <Ionicons
                    name={isDark ? "sunny-outline" : "moon-outline"}
                    size={28}
                    color={C.textSecondary}
                  />
                </Pressable>
              </AnimatedScreen>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>

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
    alignItems: "center",
    marginTop: 24,
  },
});
