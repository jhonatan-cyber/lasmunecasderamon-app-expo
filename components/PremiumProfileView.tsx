import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient, BASE_URL } from '../api/client';
import { useAccentColor } from '../hooks/useAccentColor';
import { useAuthStore } from '../store/authStore';
import { THEME_OPTIONS, useThemeStore } from '../store/themeStore';
import { PremiumAlert } from './PremiumAlert';

interface PremiumProfileViewProps {
    roleLabel?: string;
    avatarEmoji?: string;
    showStats?: boolean;
    stats?: { svcCount?: number; rating?: number };
    onLogout?: () => void;
    onClose?: () => void;
}

type ProfileState = {
    pageLoading: boolean;
    saving: boolean;
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
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    };
};

type ProfileAction =
    | { type: 'SET_PAGE_LOADING'; payload: boolean }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SET_USER_DATA'; payload: any }
    | { type: 'UPDATE_FIELD'; field: string; value: any }
    | { type: 'SET_IMAGE_PICKER_VISIBLE'; payload: boolean }
    | { type: 'SET_CIVIL_PICKER_VISIBLE'; payload: boolean }
    | { type: 'SET_ALERT_CONFIG'; payload: ProfileState['alertConfig'] };

const ESTADO_CIVIL_OPTIONS = ['Soltero/a', 'Casado/a', 'Unión Libre', 'Divorciado/a', 'Viudo/a', 'Separado/a'];

const initialState = (user: any): ProfileState => ({
    pageLoading: true,
    saving: false,
    nick: user?.nick || '',
    phone: user?.phone || '',
    address: user?.address || '',
    estadoCivil: user?.estado_civil || 'Soltero/a',
    password: '',
    image: null,
    imagePickerVisible: false,
    civilPickerVisible: false,
    alertConfig: { visible: false, title: '', message: '', type: 'info' },
});

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
    switch (action.type) {
        case 'SET_PAGE_LOADING': return { ...state, pageLoading: action.payload };
        case 'SET_SAVING': return { ...state, saving: action.payload };
        case 'SET_USER_DATA':
            return {
                ...state,
                pageLoading: false,
                nick: action.payload?.nick || state.nick,
                phone: action.payload?.phone || state.phone,
                address: action.payload?.address || state.address,
                estadoCivil: action.payload?.estado_civil || state.estadoCivil,
            };
        case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
        case 'SET_IMAGE_PICKER_VISIBLE': return { ...state, imagePickerVisible: action.payload };
        case 'SET_CIVIL_PICKER_VISIBLE': return { ...state, civilPickerVisible: action.payload };
        case 'SET_ALERT_CONFIG': return { ...state, alertConfig: action.payload };
        default: return state;
    }
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, borderRadius = 10, style = {} }: {
    width: number | string; height: number; borderRadius?: number; style?: any;
}) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 750, easing: Easing.ease, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 750, easing: Easing.ease, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#374151', opacity: anim }, style]} />;
};

// ─── Main Component ─────────────────────────────────────────────────────────
export function PremiumProfileView({ roleLabel, avatarEmoji = '👤', onLogout, onClose }: PremiumProfileViewProps) {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const { setAccentColor } = useThemeStore();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);

    const [state, dispatch] = useReducer(profileReducer, initialState(user));
    const { pageLoading, saving, nick, phone, address, estadoCivil, password, image, imagePickerVisible, civilPickerVisible, alertConfig } = state;

    const showAlert = useCallback((title: string, message: string, type: ProfileState['alertConfig']['type'] = 'success', onConfirm?: () => void, showCancel = false) => {
        dispatch({ type: 'SET_ALERT_CONFIG', payload: { visible: true, title, message, type, onConfirm, showCancel } });
    }, []);

    const hideAlert = useCallback(() => {
        dispatch({ type: 'SET_ALERT_CONFIG', payload: { ...alertConfig, visible: false } });
    }, [alertConfig]);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#1F2937';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    useEffect(() => {
        if (user) {
            const t = setTimeout(() => {
                dispatch({ type: 'SET_USER_DATA', payload: user });
            }, 600);
            return () => clearTimeout(t);
        } else {
            dispatch({ type: 'SET_PAGE_LOADING', payload: false });
        }
    }, [user?.id]);

    const takePhoto = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { showAlert('Permiso denegado', 'Se requiere acceso a la cámara.', 'warning'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!result.canceled) dispatch({ type: 'UPDATE_FIELD', field: 'image', value: result.assets[0].uri });
        dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false });
    }, []);

    const pickImage = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { showAlert('Permiso denegado', 'Se requiere acceso a la galería.', 'warning'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!result.canceled) dispatch({ type: 'UPDATE_FIELD', field: 'image', value: result.assets[0].uri });
        dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false });
    }, []);

    const handleSave = useCallback(async () => {
        dispatch({ type: 'SET_SAVING', payload: true });
        try {
            const formData = new FormData();
            formData.append('nick', nick);
            formData.append('telefono', phone);
            formData.append('direccion', address);
            formData.append('estado_civil', estadoCivil);
            if (password.trim()) {
                if (password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
                formData.append('password', password);
            }
            if (image) {
                const uriParts = image.split('.');
                const fileType = uriParts[uriParts.length - 1];
                const fileName = image.split('/').pop() || 'profile.jpg';
                // @ts-ignore
                formData.append('foto', { uri: image, name: fileName, type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}` });
            }
            const res = await apiClient('/users/profile', { method: 'PUT', body: formData });
            if (res.success) {
                const updatedUser: any = { ...user, nick, phone, address, estado_civil: estadoCivil };
                if (res.user?.foto) updatedUser.foto = res.user.foto;
                await useAuthStore.getState().updateProfile(updatedUser);
                showAlert('Éxito', 'Perfil actualizado correctamente', 'success', () => { if (onClose) onClose(); });
            } else {
                throw new Error(res.message || 'Error al actualizar');
            }
        } catch (error: any) {
            showAlert('Error', error.message || 'No se pudo actualizar el perfil', 'danger');
        } finally {
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    }, [nick, phone, address, estadoCivil, password, image, user, onClose]);

    const handleInternalLogout = useCallback(() => {
        showAlert('Cerrar sesión', '¿Estás seguro que deseas salir?', 'warning', () => {
            if (onLogout) onLogout();
            else { logout(); router.replace('/(auth)/login'); }
        }, true);
    }, [onLogout, logout, router]);

    const Header = ({ skeletonMode = false }: { skeletonMode?: boolean }) => (
        <LinearGradient
            colors={skeletonMode
                ? (isDark ? ['#FFFFFF', '#F1F5F9'] as any : ['#2D2870', '#1E1B4B', '#0F0D2E'] as any)
                : (gradientColors as any)
            }
            style={[styles.header, {
                paddingTop: insets.top + (isTablet ? 20 : 10),
                paddingBottom: 25,
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
            }]}
        >
            <View style={styles.headerTop}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    {skeletonMode
                        ? <View style={{ width: 24, height: 24 }} />
                        : <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color="#FFFFFF" />
                    }
                </Pressable>
                <View style={{ flex: 1, marginLeft: 10, gap: skeletonMode ? 8 : 2 }}>
                    {skeletonMode ? (
                        <>
                            <SkeletonBox width={140} height={20} borderRadius={8} style={{ backgroundColor: isDark ? '#D1D5DB' : 'rgba(255,255,255,0.25)' }} />
                            <SkeletonBox width={90} height={13} borderRadius={6} style={{ backgroundColor: isDark ? '#9CA3AF' : 'rgba(255,255,255,0.18)' }} />
                        </>
                    ) : (
                        <>
                            <Text style={[styles.headerTitle, { color: isDark ? '#111827' : '#FFFFFF' }, isTablet && { fontSize: 28 }]}>Mi Perfil</Text>
                            <Text style={[styles.headerSubtitle, { color: isDark ? '#6B7280' : 'rgba(255,255,255,0.8)' }, isTablet && { fontSize: 17 }]}>{roleLabel || 'Cuenta personal'}</Text>
                        </>
                    )}
                </View>
            </View>
        </LinearGradient>
    );

    if (pageLoading) {
        return (
            <View style={[styles.container, { backgroundColor: bg }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={isDark ? 'dark' : 'light'} />
                <Header skeletonMode />
                <ScrollView style={{ flex: 1 }} scrollEnabled={false} contentContainerStyle={{ padding: 24 }}>
                    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
                        <SkeletonBox width={140} height={140} borderRadius={70} />
                        <SkeletonBox width={160} height={22} borderRadius={8} />
                        <SkeletonBox width={80} height={28} borderRadius={20} />
                    </View>
                    {[1, 2, 3, 4].map(i => (
                        <View key={i} style={{ marginBottom: 20, gap: 8 }}>
                            <SkeletonBox width={120} height={13} borderRadius={6} />
                            <SkeletonBox width="100%" height={56} borderRadius={18} />
                        </View>
                    ))}
                    <SkeletonBox width="100%" height={1} borderRadius={1} style={{ marginVertical: 24 }} />
                    <View style={{ marginBottom: 20, gap: 8 }}>
                        <SkeletonBox width={180} height={13} borderRadius={6} />
                        <SkeletonBox width="100%" height={56} borderRadius={18} />
                    </View>
                    <SkeletonBox width="100%" height={60} borderRadius={20} style={{ marginTop: 10 }} />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'dark' : 'light'} />
            <Header />
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={styles.profileHero}>
                    <View style={[styles.avatarBorder, { borderColor: accentColor }]}>
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
                        <Pressable style={[styles.editPhotoBadge, { backgroundColor: accentColor }]} onPress={() => dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: true })}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                        </Pressable>
                    </View>
                    <Text style={[styles.userName, { color: textPrimary }]}>{user?.name} {user?.lastName}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
                        <Text style={[styles.roleText, { color: accentColor }]}>{roleLabel || user?.role?.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Apariencia del Sistema</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                            <View style={{ flexDirection: 'row', gap: 12, paddingRight: 20 }}>
                                {THEME_OPTIONS.map((theme) => {
                                    const isSelected = accentColor === theme.color;
                                    return (
                                        <Pressable
                                            key={theme.color}
                                            onPress={() => setAccentColor(user?.id || 0, theme.color)}
                                            style={[
                                                styles.colorCircle,
                                                { backgroundColor: theme.color },
                                                isSelected && { borderWidth: 3, borderColor: textPrimary, transform: [{ scale: 1.1 }] }
                                            ]}
                                        >
                                            {isSelected && <Ionicons name="checkmark" size={20} color="#FFF" />}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Nickname / Nombre de Escena</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                            <Ionicons name="star-outline" size={20} color={accentColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: textPrimary }]}
                                value={nick}
                                onChangeText={val => dispatch({ type: 'UPDATE_FIELD', field: 'nick', value: val })}
                                placeholder="Tu nick"
                                placeholderTextColor={textSecondary}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Teléfono</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                            <Ionicons name="call-outline" size={20} color={accentColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: textPrimary }]}
                                value={phone}
                                onChangeText={val => dispatch({ type: 'UPDATE_FIELD', field: 'phone', value: val })}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Dirección</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                            <Ionicons name="location-outline" size={20} color={accentColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: textPrimary }]}
                                value={address}
                                onChangeText={val => dispatch({ type: 'UPDATE_FIELD', field: 'address', value: val })}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Estado Civil</Text>
                        <Pressable
                            style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}
                            onPress={() => dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: true })}
                        >
                            <Ionicons name="heart-outline" size={20} color={accentColor} style={styles.inputIcon} />
                            <Text style={[styles.input, { color: textPrimary, paddingTop: 12 }]}>{estadoCivil}</Text>
                            <Ionicons name="chevron-down" size={20} color={textSecondary} />
                        </Pressable>
                    </View>

                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Nueva Contraseña</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={accentColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: textPrimary }]}
                                value={password}
                                onChangeText={val => dispatch({ type: 'UPDATE_FIELD', field: 'password', value: val })}
                                secureTextEntry
                                placeholder="••••••••"
                            />
                        </View>
                    </View>

                    <View style={styles.actionContainer}>
                        <Pressable
                            style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
                        </Pressable>

                        <Pressable style={styles.logoutBtn} onPress={handleInternalLogout}>
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={imagePickerVisible} transparent animationType="fade" onRequestClose={() => dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false })}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Elegir Foto</Text>
                        <Pressable style={styles.modalOption} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={24} color={accentColor} />
                            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Cámara</Text>
                        </Pressable>
                        <Pressable style={styles.modalOption} onPress={pickImage}>
                            <Ionicons name="image-outline" size={24} color={accentColor} />
                            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Galería</Text>
                        </Pressable>
                        <Pressable style={styles.cancelModalBtn} onPress={() => dispatch({ type: 'SET_IMAGE_PICKER_VISIBLE', payload: false })}>
                            <Text style={[styles.cancelModalBtnText, { color: accentColor }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={civilPickerVisible} transparent animationType="fade" onRequestClose={() => dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: false })}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Estado Civil</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {ESTADO_CIVIL_OPTIONS.map(opt => (
                                <Pressable
                                    key={opt}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        dispatch({ type: 'UPDATE_FIELD', field: 'estadoCivil', value: opt });
                                        dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: false });
                                    }}
                                >
                                    <Text style={[styles.modalOptionText, { color: textPrimary, fontWeight: estadoCivil === opt ? '800' : '400' }]}>{opt}</Text>
                                    {estadoCivil === opt && <Ionicons name="checkmark" size={20} color={accentColor} />}
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Pressable style={styles.cancelModalBtn} onPress={() => dispatch({ type: 'SET_CIVIL_PICKER_VISIBLE', payload: false })}>
                            <Text style={[styles.cancelModalBtnText, { color: accentColor }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

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

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 16 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerSubtitle: { fontSize: 15, fontWeight: '500', opacity: 0.8 },
    profileHero: { alignItems: 'center', paddingVertical: 32 },
    avatarBorder: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, padding: 4, position: 'relative' },
    avatar: { width: '100%', height: '100%', borderRadius: 60 },
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 60 },
    editPhotoBadge: { position: 'absolute', bottom: 5, right: 5, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
    userName: { fontSize: 24, fontWeight: '800', marginTop: 16 },
    roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
    roleText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    formContainer: { padding: 24 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { height: 56, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    divider: { height: 1, width: '100%', marginVertical: 30, opacity: 0.2 },
    actionContainer: { marginTop: 10, gap: 16 },
    saveBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
    logoutBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700', marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalContent: { width: '100%', borderRadius: 30, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
    modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#37415120', justifyContent: 'space-between' },
    modalOptionText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
    cancelModalBtn: { marginTop: 20, padding: 12 },
    cancelModalBtnText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    colorCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
