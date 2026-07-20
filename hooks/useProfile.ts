import { useState, useCallback, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
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
        await updateProfile(profile);
        setFormData((prev) => ({
          ...prev,
          nick: profile.nick || prev.nick,
          phone: profile.telefono || profile.phone || prev.phone,
          address: profile.direccion || profile.address || prev.address,
          estadoCivil: profile.estado_civil || prev.estadoCivil,
        }));
      }
    } catch (error) {
      logger.captureException(error, { context: "useProfile:fetchProfile" });
    } finally {
      setLoading(false);
    }
  }, [updateProfile]);

  useEffect(() => {
    if (!user) return;

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
        payload.data?.userId == user.id
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
  }, [user, fetchProfile]);

  const takePhoto = useCallback(async () => {
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
  }, [updateField]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return { success: false, message: "Se requiere acceso a la galería" };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      updateField("image", result.assets[0].uri);
      return { success: true };
    }
    return { success: false };
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
        const uri = formData.image;
        const cleanUri = uri.split("?")[0];
        const uriParts = cleanUri.split(".");
        const extension = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";
        const fileType = extension === "jpg" ? "jpeg" : extension;
        const fileName = cleanUri.split("/").pop() || `profile.${extension}`;

        form.append("foto", {
          uri: uri,
          name: fileName,
          type: `image/${fileType}`,
        } as any);
      }

      const res = await apiClientSafe<UserProfileResponse>("/users", {
        method: "PUT",
        body: form,
      });

      if (res.success) {
        const d = res.data || {};
        const updatedUser: Partial<User> = {
          ...(user ?? {}),
          nick: d.nick || formData.nick,
          phone: d.phone || formData.phone,
          address: d.address || formData.address,
          estado_civil: d.maritalStatus || formData.estadoCivil,
          ...(d.foto ? { foto: d.foto } : {}),
        };
        await updateProfile(updatedUser);
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
