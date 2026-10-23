import { useState, useCallback } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { eventBus } from "@/utils/eventBus";
import { apiClientSafe } from "@/api/client";
import { useAuthStore, type User } from "@/store/authStore";
import type { UserProfileResponse } from "@/types/api";

import logger from "@/utils/logger";

export function useProfile() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [loading, setLoading] = useState(!!user);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nick: user?.nick || "",
    phone: user?.phone || "",
    address: user?.address || "",
    estadoCivil: user?.estado_civil || "Soltero/a",
    password: "",
    image: null as string | null,
  });

  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClientSafe<UserProfileResponse>("/users/profile", { signal });
      const profile = res.data;
      if (res.success && profile) {
        await updateProfile(profile, { localOnly: true });
        setFormData((prev) => ({
          ...prev,
          nick: profile.nick || prev.nick,
          phone: profile.telefono || profile.phone || prev.phone,
          address: profile.direccion || profile.address || prev.address,
          estadoCivil: profile.estado_civil || prev.estadoCivil,
        }));
      }
    } catch (error) {
      // Refresh de fondo: sin red/timeout/401 usa los datos cacheados del
      // store en silencio (fetchError solo reporta lo inesperado).
      logger.fetchError(error, { context: "useProfile:fetchProfile" });
    } finally {
      setLoading(false);
    }
  }, [updateProfile]);

  const userId = user?.id;
  useFocusEffect(useCallback(() => {
    if (userId == null) return;

    let active = true;
    const abortController = new AbortController();

    const loadData = async () => {
      if (active) {
        await fetchProfile(abortController.signal);
      }
    };
    loadData();

    // Real-time profile updates via SSE — reemplaza polling
    const sub = eventBus.addListener('sse_event', (payload: any) => {
      if (
        payload.type === 'profile_updated' &&
        String(payload.data?.userId) === String(userId)
      ) {
        if (active) {
          fetchProfile(abortController.signal);
        }
      }
    });

    return () => {
      active = false;
      abortController.abort();
      sub.remove();
    };
  }, [userId, fetchProfile]));

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted")
        return { success: false, message: "Se requiere acceso a la cámara" };

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        updateField("image", result.assets[0].uri);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      logger.fetchError(error, { context: "useProfile:takePhoto" });
      return { success: false, message: "No se pudo abrir la cámara. Vuelve a intentarlo." };
    }
  }, [updateField]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted")
        return { success: false, message: "Se requiere acceso a la galería" };

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        updateField("image", result.assets[0].uri);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      logger.fetchError(error, { context: "useProfile:pickImage" });
      return { success: false, message: "No se pudo abrir la galería. Vuelve a intentarlo." };
    }
  }, [updateField]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("id", String(user?.id || ""));
      form.append("nick", formData.nick);
      form.append("phone", formData.phone);
      form.append("address", formData.address);
      form.append("maritalStatus", formData.estadoCivil);

      if (formData.password.trim()) {
        if (formData.password.length < 4)
          throw new Error("La contraseña debe tener al menos 4 caracteres");
        form.append("password", formData.password);
      }

      if (formData.image) {
        if (Platform.OS === "web") {
          const response = await fetch(formData.image);
          if (!response.ok) throw new Error("No se pudo leer la foto seleccionada");
          const image = await response.blob();
          const extension = image.type.split("/")[1] || "jpg";
          form.append("foto", image, `profile.${extension}`);
        } else {
          const image = new File(formData.image);
          form.append("foto", image, image.name);
        }
      }

      const res = await apiClientSafe<UserProfileResponse>("/users", {
        method: "PUT",
        body: form,
      });

      if (res.success) {
        const d = res.data || {};
        if (formData.image) {
          const persisted = await apiClientSafe<UserProfileResponse>("/users/profile");
          if (!d.foto || !persisted.success || persisted.data?.foto !== d.foto) {
            throw new Error("No se pudo confirmar que la foto quedó guardada. Vuelve a intentarlo.");
          }
        }
        const updatedUser: Partial<User> = {
          nick: d.nick || formData.nick,
          phone: d.phone || formData.phone,
          address: d.address || formData.address,
          estado_civil: d.maritalStatus || formData.estadoCivil,
          ...(d.foto ? { foto: d.foto } : {}),
        };
        await updateProfile(updatedUser, { localOnly: true });
        setFormData((prev) => ({ ...prev, image: null, password: "" }));
        return { success: true, message: "Perfil actualizado correctamente" };
      } else {
        throw new Error(res.message || "Error al actualizar perfil");
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Error fatal al guardar",
      };
    } finally {
      setSaving(false);
    }
  }, [formData, user, updateProfile]);

  return {
    loading,
    saving,
    formData,
    updateField,
    takePhoto,
    pickImage,
    saveProfile,
    refresh: fetchProfile,
  };
}
