import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useReducer } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';
import { apiClient, BASE_URL } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface PremiumProfileViewProps {
    roleLabel?: string;
    avatarEmoji?: string;
    showStats?: boolean;
    stats?: {
        svcCount?: number;
        rating?: number;
    };
    onLogout?: () => void;
    onClose?: () => void;
}

type ProfileState = {
    loading: boolean;
    nick: string;
    phone: string;
    address: string;
    estadoCivil: string;
    password: string;
    image: string | null;
    imagePickerVisible: boolean;
    civilPickerVisible: boolean;
    alertConfig: {
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'danger' | 'warning' | 'info';
        onConfirm?: () => void;
        showCancel: boolean;
    };
};

type ProfileAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_USER_DATA'; payload: any }
    | { type: 'UPDATE_FIELD'; field: string; value: any }
    | { type: 'SHOW_ALERT'; payload: Partial<ProfileState['alertConfig']> }
    | { type: 'CLOSE_ALERT' }
    | { type: 'SET_IMAGE_PICKER_VISIBLE'; payload: boolean }
    | { type: 'SET_CIVIL_PICKER_VISIBLE'; payload: boolean };

const ESTADO_CIVIL_OPTIONS = ['Soltero/a', 'Casado/a', 'Unión Libre', 'Divorciado/a', 'Viudo/a', 'Separado/a'];

const showAlert = (title: string, message: string, type: 'success' | 'danger' | 'warning' = 'success', onConfirm?: () => void, isConfirm = false) => {
    if (isConfirm) {
        Alert.alert(title, message, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
        ]);
    } else {
        Alert.alert(title, message, [{ text: 'OK', onPress: onConfirm }]);
    }
};

const initialProfileState = (user: any): ProfileState => ({
    loading: false,
    nick: user?.nick || '',
    phone: user?.phone || '',
    address: user?.address || '',
    estadoCivil: user?.estado_civil || 'Soltero/a',
    password: '',
    image: null,
    imagePickerVisible: false,
    civilPickerVisible: false,
    alertConfig: {
        visible: false,
        title: '',
        message: '',
        type: 'info',
        showCancel: false,
    },
});

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_USER_DATA':
            return {
                ...state,
                nick: action.payload?.nick || state.nick,
                phone: action.payload?.phone || state.phone,
                address: action.payload?.address || state.address,
                estadoCivil: action.payload?.estado_civil || state.estadoCivil,
            };
        case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
        case 'SHOW_ALERT': return { ...state, alertConfig: { ...state.alertConfig, ...action.payload } };
        case 'CLOSE_ALERT': return { ...state, alertConfig: { ...state.alertConfig, visible: false } };
        case 'SET_IMAGE_PICKER_VISIBLE': return { ...state, imagePickerVisible: action.payload };
        case 'SET_CIVIL_PICKER_VISIBLE': return { ...state, civilPickerVisible: action.payload };
        default: return state;
    }
}

export function PremiumProfileView({ roleLabel, avatarEmoji = '👤', onLogout, onClose }: PremiumProfileViewProps) {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);

    const [state, dispatch] = useReducer(profileReducer, initialProfileState(user));
    const {
        loading, nick, phone, address, estadoCivil, password, image,
        imagePickerVisible, civilPickerVisible
    } = state;

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#1F2937';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    useEffect(() => {
        if (user) {
            dispatch({ type: 'SET_USER_DATA', payload: user });
        }
    }, [user?.id]);

    const takePhoto = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permiso denegado', 'Se requiere acceso a la cámara.', 'warning');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled) {
            dispatch({ type: 'UPDATE_FIELD', field: 'image', value: result.assets[0].uri });
        }
        dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false });
    }, []);

    const pickImage = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permiso denegado', 'Se requiere acceso a la galería.', 'warning');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled) {
            dispatch({ type: 'UPDATE_FIELD', field: 'image', value: result.assets[0].uri });
        }
        dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false });
    }, []);

    const handleSave = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const formData = new FormData();
            formData.append('nick', nick);
            formData.append('telefono', phone);
            formData.append('direccion', address);
            formData.append('estado_civil', estadoCivil);

            if (password.trim()) {
                if (password.length < 4) {
                    throw new Error('La contraseña debe tener al menos 4 caracteres');
                }
                formData.append('password', password);
            }

            if (image) {
                const uriParts = image.split('.');
                const fileType = uriParts[uriParts.length - 1];
                const fileName = image.split('/').pop() || 'profile.jpg';
                // @ts-ignore
                formData.append('foto', {
                    uri: image,
                    name: fileName,
                    type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
                });
            }

            const res = await apiClient('/users/profile', {
                method: 'PUT',
                body: formData,
            });

            if (res.success) {
                const updatedUser: any = { ...user, nick, phone, address, estado_civil: estadoCivil };
                if (res.user && res.user.foto) updatedUser.foto = res.user.foto;
                await useAuthStore.getState().updateProfile(updatedUser);
                showAlert('Éxito', 'Perfil actualizado correctamente', 'success', () => {
                    if (onClose) onClose();
                });
            } else {
                throw new Error(res.message || 'Error al actualizar');
            }
        } catch (error: any) {
            showAlert('Error', error.message || 'No se pudo actualizar el perfil', 'danger');
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [nick, phone, address, estadoCivil, password, image, user, onClose]);

    const handleInternalLogout = useCallback(() => {
        showAlert('Cerrar sesión', '¿Estás seguro que deseas salir?', 'warning', () => {
            if (onLogout) onLogout();
            else {
                logout();
                router.replace('/(auth)/login');
            }
        }, true);
    }, [onLogout, logout, router]);

    return (
        <ScrollView style={[styles.container, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHero}>
                <View style={[styles.avatarBorder, { borderColor: '#8B5CF6' }]}>
                    {image || user?.foto ? (
                        <Image
                            source={{ uri: image ? image : (user?.foto?.startsWith('http') ? user.foto : `${BASE_URL}/img/users/${user?.foto}`) }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: cardBg }]}>
                            <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
                        </View>
                    )}
                    <Pressable
                        style={styles.editPhotoBadge}
                        onPress={() => dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: true })}
                        accessibilityLabel="Cambiar foto de perfil"
                        accessibilityRole="button"
                    >
                        <Ionicons name="camera" size={16} color="#FFF" />
                    </Pressable>
                </View>
                <Text style={[styles.userName, { color: textPrimary }]}>{user?.name} {user?.lastName}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{roleLabel || user?.role?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>Nickname / Nombre de Escena</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                        <Ionicons name="star-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textPrimary }]}
                            value={nick}
                            onChangeText={(val) => dispatch({ type: 'UPDATE_FIELD', field: 'nick', value: val })}
                            placeholder="Tu nick"
                            placeholderTextColor={textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>Teléfono</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                        <Ionicons name="call-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textPrimary }]}
                            value={phone}
                            onChangeText={(val) => dispatch({ type: 'UPDATE_FIELD', field: 'phone', value: val })}
                            keyboardType="phone-pad"
                            placeholder="Ej: +569..."
                            placeholderTextColor={textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>Dirección</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                        <Ionicons name="location-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textPrimary }]}
                            value={address}
                            onChangeText={(val) => dispatch({ type: 'UPDATE_FIELD', field: 'address', value: val })}
                            placeholder="Tu dirección"
                            placeholderTextColor={textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>Estado Civil</Text>
                    <Pressable
                        style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: true })}
                        accessibilityLabel="Seleccionar estado civil"
                        accessibilityRole="combobox"
                    >
                        <Ionicons name="heart-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                        <Text style={[styles.input, { color: textPrimary, paddingTop: 12 }]}>{estadoCivil}</Text>
                        <Ionicons name="chevron-down" size={20} color={textSecondary} />
                    </Pressable>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>Nueva Contraseña (Dejar en blanco para mantener)</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                        <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textPrimary }]}
                            value={password}
                            onChangeText={(val) => dispatch({ type: 'UPDATE_FIELD', field: 'password', value: val })}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.actionContainer}>
                    <Pressable
                        style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={loading}
                        accessibilityLabel="Guardar cambios"
                        accessibilityRole="button"
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
                    </Pressable>

                    <Pressable
                        style={styles.logoutBtn}
                        onPress={handleInternalLogout}
                        accessibilityLabel="Cerrar sesión"
                        accessibilityRole="button"
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
                    </Pressable>
                </View>
            </View>

            {/* Modal de selección de imagen */}
            <Modal visible={imagePickerVisible} transparent={true} animationType="fade" onRequestClose={() => dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false })}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Elegir Foto</Text>
                        <Pressable style={styles.modalOption} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={24} color="#8B5CF6" />
                            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Cámara</Text>
                        </Pressable>
                        <Pressable style={styles.modalOption} onPress={pickImage}>
                            <Ionicons name="image-outline" size={24} color="#8B5CF6" />
                            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Galería</Text>
                        </Pressable>
                        <Pressable style={styles.cancelModalBtn} onPress={() => dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false })}>
                            <Text style={styles.cancelModalBtnText}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal de estado civil */}
            <Modal visible={civilPickerVisible} transparent={true} animationType="fade" onRequestClose={() => dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: false })}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Estado Civil</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {ESTADO_CIVIL_OPTIONS.map((opt) => (
                                <Pressable
                                    key={opt}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        dispatch({ type: 'UPDATE_FIELD', field: 'estadoCivil', value: opt });
                                        dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: false });
                                    }}
                                >
                                    <Text style={[styles.modalOptionText, { color: textPrimary, fontWeight: estadoCivil === opt ? '800' : '400' }]}>{opt}</Text>
                                    {estadoCivil === opt && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Pressable style={styles.cancelModalBtn} onPress={() => dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: false })}>
                            <Text style={styles.cancelModalBtnText}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    profileHero: { alignItems: 'center', paddingVertical: 40 },
    avatarBorder: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, padding: 4, position: 'relative' },
    avatar: { width: '124%', height: '124%', borderRadius: 60 }, // Fixed size
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 60 },
    editPhotoBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#8B5CF6', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
    userName: { fontSize: 24, fontWeight: '800', marginTop: 16 },
    roleBadge: { backgroundColor: '#8B5CF620', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
    roleText: { color: '#8B5CF6', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    formContainer: { padding: 24 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { height: 56, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    divider: { height: 1, width: '100%', marginVertical: 30, opacity: 0.1 },
    actionContainer: { marginTop: 10, gap: 16 },
    saveBtn: { backgroundColor: '#8B5CF6', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
    logoutBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700', marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalContent: { width: '100%', borderRadius: 30, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
    modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#37415120', justifyContent: 'space-between' },
    modalOptionText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
    cancelModalBtn: { marginTop: 20, padding: 12 },
    cancelModalBtnText: { color: '#8B5CF6', fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
