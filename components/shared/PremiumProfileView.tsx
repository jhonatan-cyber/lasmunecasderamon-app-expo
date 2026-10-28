import { styles } from "./PremiumProfileView.styles";
import logger from "@/utils/logger";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState, useEffect } from "react";
import {
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "@/api/client";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useAuthStore } from "@/store/authStore";
import { ProfileThemePicker } from "@/components/shared/profile/ProfileThemePicker";
import { useProfile } from "@/hooks/useProfile";
import { isAdminRole } from "@/utils/userRole";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { isVoiceAlertsEnabled, setVoiceAlertsEnabled } from "@/services/pushNotifications";
import { ProfileHeader } from "@/components/shared/profile/ProfileHeader";
import { ProfileHero } from "@/components/shared/profile/ProfileHero";
import { ProfileFormFields } from "@/components/shared/profile/ProfileFormFields";
import { ProfileActions } from "@/components/shared/profile/ProfileActions";
import { ProfileImagePickerModal } from "@/components/shared/profile/ProfileImagePickerModal";
import { CivilStatusModal } from "@/components/shared/profile/CivilStatusModal";
import { ProfileLoadingState } from "@/components/shared/profile/ProfileLoadingState";

interface PremiumProfileViewProps {
  roleLabel?: string;
  avatarEmoji?: string;
  onLogout?: () => void;
  onClose?: () => void;
}

export function PremiumProfileView({
  roleLabel,
  avatarEmoji = "👤",
  onLogout,
  onClose,
}: PremiumProfileViewProps) {
  const { accentColor, gradientColors, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const roleLabelEfectivo = isAdminRole(user) ? "Administrador" : roleLabel;

  const {
    loading,
    saving,
    formData,
    updateField,
    takePhoto,
    pickImage,
    saveProfile,
  } = useProfile();

  const [failedPhotoUri, setFailedPhotoUri] = useState<string | null>(null);
  const currentPhotoUri = formData.image || (user?.foto ? (user.foto.startsWith("http") ? user.foto : `${BASE_URL}/api/images/users/${encodeURIComponent(user.foto)}`) : null);

  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [civilPickerVisible, setCivilPickerVisible] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    void isVoiceAlertsEnabled().then((v) => {
      if (active) setVoiceEnabled(v);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleVoice = useCallback((value: boolean) => {
    setVoiceEnabled(value);
    void setVoiceAlertsEnabled(value);
  }, []);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({ visible: false, title: "", message: "", type: "info" });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: any = "success",
      onConfirm?: () => void,
      showCancel = false,
    ) => {
      setAlertConfig({
        visible: true,
        title,
        message,
        type,
        onConfirm,
        showCancel,
      });
    },
    [],
  );

  const hideAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleTakePhoto = async () => {
    const res = await takePhoto();
    if (!res.success && res.message) {
      showAlert("Error", res.message, "warning");
    }
    setImagePickerVisible(false);
  };

  const handlePickImage = async () => {
    const res = await pickImage();
    if (!res.success && res.message) {
      showAlert("Error", res.message, "warning");
    }
    setImagePickerVisible(false);
  };

  const onSave = async () => {
    const res = await saveProfile();
    if (res.success) {
      showAlert("Éxito", res.message, "success", () => {
        if (onClose) onClose();
      });
    } else {
      showAlert("Error", res.message, "danger");
    }
  };

  const handleInternalLogout = useCallback(() => {
    showAlert(
      "Cerrar sesión",
      "¿Estás seguro que deseas salir?",
      "warning",
      () => {
        if (onLogout) onLogout();
        else {
          logout();
          router.replace("/(auth)/login");
        }
      },
      true,
    );
  }, [onLogout, logout, router, showAlert]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={isDark ? "dark" : "light"} />
        <ProfileLoadingState
          bg={bg}
          isDark={isDark}
          roleLabel={roleLabelEfectivo}
          isTablet={isTablet}
          gradientColors={gradientColors as unknown as string[]}
          topInset={insets.top}
          onBack={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "dark" : "light"} />
      <ProfileHeader
        roleLabel={roleLabelEfectivo}
        isTablet={isTablet}
        isDark={isDark}
        gradientColors={gradientColors as unknown as string[]}
        topInset={insets.top}
        onBack={() => router.back()}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero
          photoUri={currentPhotoUri}
          failedPhotoUri={failedPhotoUri}
          onPhotoError={(uri) => {
            setFailedPhotoUri(uri);
            logger.warn("No se pudo cargar la foto de perfil", { uri });
          }}
          avatarEmoji={avatarEmoji}
          userName={`${user?.name ?? ""} ${user?.lastName ?? ""}`}
          roleLabel={roleLabelEfectivo || user?.role?.toUpperCase()}
          accentColor={accentColor}
          cardBg={cardBg}
          textPrimary={textPrimary}
          onEditPhoto={() => setImagePickerVisible(true)}
        />

        <View style={styles.formContainer}>
          <ProfileThemePicker
            accentColor={accentColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <ProfileFormFields
            formData={formData}
            updateField={updateField}
            accentColor={accentColor}
            cardBg={cardBg}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onOpenCivilPicker={() => setCivilPickerVisible(true)}
          />

          <View style={[styles.settingRow, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: textPrimary }]}>
                Alertas por voz
              </Text>
              <Text style={[styles.settingSubtitle, { color: textSecondary }]}>
                Anuncia en voz alta pedidos y llamados
              </Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={handleToggleVoice}
              trackColor={{ false: "#767577", true: accentColor }}
              thumbColor="#FFF"
            />
          </View>

          <ProfileActions
            saving={saving}
            accentColor={accentColor}
            onSave={onSave}
            onLogout={handleInternalLogout}
          />
        </View>
      </ScrollView>

      <ProfileImagePickerModal
        visible={imagePickerVisible}
        accentColor={accentColor}
        cardBg={cardBg}
        textPrimary={textPrimary}
        onTakePhoto={handleTakePhoto}
        onPickImage={handlePickImage}
        onClose={() => setImagePickerVisible(false)}
      />

      <CivilStatusModal
        visible={civilPickerVisible}
        selected={formData.estadoCivil}
        accentColor={accentColor}
        cardBg={cardBg}
        textPrimary={textPrimary}
        onSelect={(value) => updateField("estadoCivil", value)}
        onClose={() => setCivilPickerVisible(false)}
      />

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() => {
          hideAlert();
          if (alertConfig.onConfirm) alertConfig.onConfirm();
        }}
        onCancel={hideAlert}
        showCancel={alertConfig.showCancel}
      />
    </View>
  );
}
