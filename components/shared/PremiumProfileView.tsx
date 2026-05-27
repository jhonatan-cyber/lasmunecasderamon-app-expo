﻿import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState, useEffect, useRef } from 'react';
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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';
import { THEME_OPTIONS, useThemeStore } from '@/store/themeStore';
import { useProfile } from '@/hooks/useProfile';
import { PremiumAlert } from '@/components/ui/PremiumAlert';

interface PremiumProfileViewProps {
    roleLabel?: string;
    avatarEmoji?: string;
    onLogout?: () => void;
    onClose?: () => void;
}

const ESTADO_CIVIL_OPTIONS = ['Soltero/a', 'Casado/a', 'Unión Libre', 'Divorciado/a', 'Viudo/a', 'Separado/a'];

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
    }, [anim]);
    return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#374151', opacity: anim }, style]} />;
};

export function PremiumProfileView({ roleLabel, avatarEmoji = 'ðŸ‘¤', onLogout, onClose }: PremiumProfileViewProps) {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const { setAccentColor } = useThemeStore();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    
    const {
        loading,
        saving,
        formData,
        updateField,
        takePhoto,
        pickImage,
        saveProfile
    } = useProfile();

    const [imagePickerVisible, setImagePickerVisible] = useState(false);
    const [civilPickerVisible, setCivilPickerVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = useCallback((title: string, message: string, type: any = 'success', onConfirm?: () => void, showCancel = false) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    }, []);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    const handleTakePhoto = async () => {
        const res = await takePhoto();
        if (!res.success && res.message) {
            showAlert('Error', res.message, 'warning');
        }
        setImagePickerVisible(false);
    };

    const handlePickImage = async () => {
        const res = await pickImage();
        if (!res.success && res.message) {
            showAlert('Error', res.message, 'warning');
        }
        setImagePickerVisible(false);
    };

    const onSave = async () => {
        const res = await saveProfile();
        if (res.success) {
            showAlert('Éxito', res.message, 'success', () => { if (onClose) onClose(); });
        } else {
            showAlert('Error', res.message, 'danger');
        }
    };

    const handleInternalLogout = useCallback(() => {
        showAlert('Cerrar sesión', '¿Estás seguro que deseas salir?', 'warning', () => {
            if (onLogout) onLogout();
            else { logout(); router.replace('/(auth)/login'); }
        }, true);
    }, [onLogout, logout, router, showAlert]);

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
                <View style={{ flex: 1, gap: skeletonMode ? 8 : 2 }}>
                    {skeletonMode ? (
                        <>
                            <SkeletonBox width={140} height={20} borderRadius={8} style={{ backgroundColor: isDark ? '#D1D5DB' : 'rgba(255,255,255,0.25)' }} />
                            <SkeletonBox width={90} height={13} borderRadius={6} style={{ backgroundColor: isDark ? '#9CA3AF' : 'rgba(255,255,255,0.18)' }} />
                        </>
                    ) : (
                        <>
                            <Text style={[styles.headerTitle, { color: isDark ? '#111827' : '#FFFFFF' }, isTablet && { fontSize: 28 }]}>Mi Perfil</Text>
                            <Text style={[styles.headerSubtitle, { color: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }, isTablet && { fontSize: 17 }]}>{roleLabel || 'Cuenta personal'}</Text>
                        </>
                    )}
                </View>
                {!skeletonMode && (
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backBtnRight}
                    >
                        <Ionicons name="arrow-back" size={isTablet ? 26 : 22} color="#FFFFFF" />
                        <Text style={styles.backTextHeader}>Atrás</Text>
                    </Pressable>
                )}
            </View>
        </LinearGradient>
    );

    if (loading) {
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
                        {formData.image || user?.foto ? (
                            <Image
                                source={{ uri: formData.image ? formData.image : (user?.foto?.startsWith('http') ? user.foto : `${BASE_URL}/img/users/${user?.foto}`) }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: cardBg }]}>
                                <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
                            </View>
                        )}
                        <Pressable style={[styles.editPhotoBadge, { backgroundColor: accentColor, borderColor: cardBg }]} onPress={() => setImagePickerVisible(true)}>
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
                                    const isSelected = accentColor.toLowerCase() === theme.color.toLowerCase();
                                    return (
                                        <Pressable
                                            key={theme.color}
                                            onPress={() => {
                                                if (user?.id) {
                                                    setAccentColor(user.id, theme.color);
                                                }
                                            }}
                                            style={[
                                                styles.colorCircle,
                                                { backgroundColor: theme.color },
                                                isSelected && { borderWidth: 3, borderColor: textPrimary, transform: [{ scale: 1.15 }] }
                                            ]}
                                        >
                                            {isSelected && <Ionicons name="checkmark" size={24} color="#FFF" />}
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
                                value={formData.nick}
                                onChangeText={val => updateField('nick', val)}
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
                                value={formData.phone}
                                onChangeText={val => updateField('phone', val)}
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
                                value={formData.address}
                                onChangeText={val => updateField('address', val)}
                            />
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>Estado Civil</Text>
                        <Pressable
                            style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}
                            onPress={() => setCivilPickerVisible(true)}
                        >
                            <Ionicons name="heart-outline" size={20} color={accentColor} style={styles.inputIcon} />
                            <Text style={[styles.input, { color: textPrimary, paddingTop: 12 }]}>{formData.estadoCivil}</Text>
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
                                value={formData.password}
                                onChangeText={val => updateField('password', val)}
                                secureTextEntry
                                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                            />
                        </View>
                    </View>

                    <View style={styles.actionContainer}>
                        <Pressable
                            style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.7 }]}
                            onPress={onSave}
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

            <Modal visible={imagePickerVisible} transparent animationType="fade" onRequestClose={() => setImagePickerVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Elegir Foto</Text>
                        <Pressable style={styles.modalOption} onPress={handleTakePhoto}>
                            <Ionicons name="camera-outline" size={24} color={accentColor} />
                            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Cámara</Text>
                        </Pressable>
                        <Pressable style={styles.modalOption} onPress={handlePickImage}>
                            <Ionicons name="image-outline" size={24} color={accentColor} />
                            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Galería</Text>
                        </Pressable>
                        <Pressable style={styles.cancelModalBtn} onPress={() => setImagePickerVisible(false)}>
                            <Text style={[styles.cancelModalBtnText, { color: accentColor }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={civilPickerVisible} transparent animationType="fade" onRequestClose={() => setCivilPickerVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Estado Civil</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {ESTADO_CIVIL_OPTIONS.map(opt => (
                                <Pressable
                                    key={opt}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        updateField('estadoCivil', opt);
                                        setCivilPickerVisible(false);
                                    }}
                                >
                                    <Text style={[styles.modalOptionText, { color: textPrimary, fontWeight: formData.estadoCivil === opt ? '800' : '400' }]}>{opt}</Text>
                                    {formData.estadoCivil === opt && <Ionicons name="checkmark" size={20} color={accentColor} />}
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Pressable style={styles.cancelModalBtn} onPress={() => setCivilPickerVisible(false)}>
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
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
    profileHero: { alignItems: 'center', paddingVertical: 32 },
    avatarBorder: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, padding: 4, position: 'relative' },
    avatar: { width: '100%', height: '100%', borderRadius: 60 },
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 60 },
    editPhotoBadge: { position: 'absolute', bottom: 5, right: 5, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
    userName: { fontSize: 24, fontWeight: '900', marginTop: 16, letterSpacing: -0.5 },
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


