import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface ProfileData {
  nick: string;
  phone: string;
  address: string;
  estado_civil: string;
  password?: string;
  image?: string;
}

export function useProfile() {
  const user = useAuthStore(state => state.user);
  const updateProfile = useAuthStore(state => state.updateProfile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nick: user?.nick || '',
    phone: user?.phone || '',
    address: user?.address || '',
    estadoCivil: user?.estado_civil || 'Soltero/a',
    password: '',
    image: null as string | null,
  });

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient('/users/profile');
      if (res.success && res.user) {
        await updateProfile(res.user);
        setFormData(prev => ({
          ...prev,
          nick: res.user.nick || prev.nick,
          phone: res.user.phone || prev.phone,
          address: res.user.address || prev.address,
          estadoCivil: res.user.estado_civil || prev.estadoCivil,
        }));
      }
    } catch (error) {
      console.error('[useProfile] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [updateProfile]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      const interval = setInterval(fetchProfile, 60000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user, fetchProfile]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return { success: false, message: 'Se requiere acceso a la cámara' };
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      updateField('image', result.assets[0].uri);
      return { success: true };
    }
    return { success: false };
  }, [updateField]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return { success: false, message: 'Se requiere acceso a la galería' };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      updateField('image', result.assets[0].uri);
      return { success: true };
    }
    return { success: false };
  }, [updateField]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append('nick', formData.nick);
      form.append('telefono', formData.phone);
      form.append('direccion', formData.address);
      form.append('estado_civil', formData.estadoCivil);

      if (formData.password.trim()) {
        if (formData.password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
        form.append('password', formData.password);
      }

      if (formData.image) {
        const uriParts = formData.image.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const fileName = formData.image.split('/').pop() || 'profile.jpg';
        // @ts-ignore
        form.append('foto', {
          uri: formData.image,
          name: fileName,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      const res = await apiClient('/users/profile', {
        method: 'PUT',
        body: form,
      });

      if (res.success) {
        const updatedUser = {
          ...user,
          nick: formData.nick,
          phone: formData.phone,
          address: formData.address,
          estado_civil: formData.estadoCivil,
          ...(res.user?.foto ? { foto: res.user.foto } : {}),
        };
        await updateProfile(updatedUser as any);
        return { success: true, message: 'Perfil actualizado correctamente' };
      } else {
        throw new Error(res.message || 'Error al actualizar perfil');
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Error fatal al guardar' };
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

