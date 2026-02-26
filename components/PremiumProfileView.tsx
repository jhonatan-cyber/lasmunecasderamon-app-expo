import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View
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

export function PremiumProfileView({
    roleLabel,
    avatarEmoji = '👤',
    showStats = false,
    stats,
    onLogout,
    onClose
}: PremiumProfileViewProps) {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const isDark = (useColorScheme() ?? 'dark') === 'dark';

    const [loading, setLoading] = useState(false);

    // Form state
    const [nick, setNick] = useState(user?.nick || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [address, setAddress] = useState(user?.address || '');
    const [estadoCivil, setEstadoCivil] = useState(user?.estado_civil || '');
    const [password, setPassword] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [imagePickerVisible, setImagePickerVisible] = useState(false);
    const [estadoCivilPickerVisible, setEstadoCivilPickerVisible] = useState(false);

    const ESTADO_CIVIL_OPTIONS = [
        'Soltero/a',
        'Casado/a',
        'Divorciado/a',
        'Viudo/a',
        'Separado/a'
    ];

    // Alert State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        showCancel?: boolean;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info', onConfirm?: () => void, showCancel = false) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
    };

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const res = await apiClient('/auth/me');
                if (res.success && res.user) {
                    useAuthStore.getState().updateProfile(res.user);
                    setNick(res.user.nick || '');
                    setPhone(res.user.phone || '');
                    setAddress(res.user.address || '');
                    setEstadoCivil(res.user.estado_civil || '');
                }
            } catch (err) {
                console.error('Error fetching user info:', err);
            }
        };
        fetchUserInfo();
    }, []);

    useEffect(() => {
        if (user) {
            setNick(user.nick || '');
            setPhone(user.phone || '');
            setAddress(user.address || '');
            setEstadoCivil(user.estado_civil || '');
        }
    }, [user]);



    const takePhoto = async () => {
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
            setImage(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
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
            setImage(result.assets[0].uri);
        }
    };

    const handleImageChoicePremium = () => {
        setImagePickerVisible(true);
    };

    const handleSave = async () => {
        setLoading(true);
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
                const updatedUser: any = {
                    nick,
                    phone,
                    address,
                    estado_civil: estadoCivil,
                };
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
            setLoading(false);
        }
    };

    const handleInternalLogout = () => {
        showAlert(
            'Cerrar sesión',
            '¿Estás seguro que deseas salir del sistema?',
            'danger',
            () => {
                if (onLogout) {
                    onLogout();
                } else {
                    logout();
                    router.replace('/(auth)/login');
                }
            },
            true
        );
    };

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
                    <Pressable style={styles.editPhotoBadge} onPress={handleImageChoicePremium}>
                        <Ionicons name="camera" size={16} color="#FFF" />
                    </Pressable>
                </View>
                <Text style={[styles.userName, { color: textPrimary }]}>{user?.name} {user?.lastName}</Text>
                {user?.nick ? (
                    <Text style={[styles.userNick, { color: textSecondary }]}>@{user.nick}</Text>
                ) : (
                    <Text style={[styles.userNick, { color: '#8B5CF6', fontSize: 12 }]}>Configurar Nick</Text>
                )}
                {roleLabel && (
                    <Text style={[styles.userRole, { color: '#8B5CF6', fontWeight: '800' }]}>{roleLabel}</Text>
                )}
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Información Personal</Text>

                <View style={[styles.inputGroup, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.label, { color: textSecondary }]}>NICK</Text>
                    <TextInput
                        style={[styles.input, { color: textPrimary }]}
                        value={nick}
                        onChangeText={setNick}
                        placeholder="Tu nick..."
                        placeholderTextColor={textSecondary}
                    />
                </View>

                <View style={[styles.row, { gap: 12 }]}>
                    <View style={[styles.inputGroup, { flex: 1, backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.label, { color: textSecondary }]}>TELÉFONO</Text>
                        <TextInput
                            style={[styles.input, { color: textPrimary }]}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            placeholder="+56 9..."
                            placeholderTextColor={textSecondary}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.label, { color: textSecondary }]}>ESTADO CIVIL</Text>
                        <Pressable
                            onPress={() => setEstadoCivilPickerVisible(true)}
                            style={styles.selectTrigger}
                        >
                            <Text style={[styles.inputText, { color: estadoCivil ? textPrimary : textSecondary }]}>
                                {estadoCivil || 'Seleccionar...'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={textSecondary} />
                        </Pressable>
                    </View>
                </View>

                <View style={[styles.inputGroup, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.label, { color: textSecondary }]}>DIRECCIÓN</Text>
                    <TextInput
                        style={[styles.input, { color: textPrimary }]}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Tu dirección..."
                        placeholderTextColor={textSecondary}
                    />
                </View>

                <View style={[styles.inputGroup, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.label, { color: textSecondary }]}>CAMBIAR CONTRASEÑA</Text>
                    <TextInput
                        style={[styles.input, { color: textPrimary }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Dejar en blanco para no cambiar"
                        placeholderTextColor={textSecondary}
                        secureTextEntry
                    />
                </View>
            </View>

            {showStats && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>Estadísticas</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                            <Text style={styles.statVal}>{stats?.svcCount || 0}</Text>
                            <Text style={[styles.statLab, { color: textSecondary }]}>Servicios</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
                            <Text style={styles.statVal}>⭐ {stats?.rating || '5.0'}</Text>
                            <Text style={[styles.statLab, { color: textSecondary }]}>Rating</Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.footer}>
                <Pressable onPress={handleSave} style={styles.saveBtn} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
                </Pressable>
                <Pressable onPress={handleInternalLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
                </Pressable>
            </View>

            <View style={{ height: 100 }} />

            {/* Premium Alert Modal */}
            <Modal
                transparent
                visible={alertConfig.visible}
                animationType="fade"
                onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.alertCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <View style={[styles.alertIconHeader, {
                            backgroundColor: alertConfig.type === 'danger' ? '#EF444420' :
                                alertConfig.type === 'success' ? '#10B98120' :
                                    alertConfig.type === 'warning' ? '#F59E0B20' : '#8B5CF620'
                        }]}>
                            <Ionicons
                                name={alertConfig.type === 'danger' ? 'alert-circle' :
                                    alertConfig.type === 'success' ? 'checkmark-circle' :
                                        alertConfig.type === 'warning' ? 'warning' : 'information-circle'}
                                size={40}
                                color={alertConfig.type === 'danger' ? '#EF4444' :
                                    alertConfig.type === 'success' ? '#10B981' :
                                        alertConfig.type === 'warning' ? '#F59E0B' : '#8B5CF6'}
                            />
                        </View>

                        <Text style={[styles.alertTitle, { color: textPrimary }]}>{alertConfig.title}</Text>
                        <Text style={[styles.alertMessage, { color: textSecondary }]}>{alertConfig.message}</Text>

                        <View style={styles.alertActions}>
                            {alertConfig.showCancel && (
                                <Pressable
                                    onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                                    style={[styles.alertBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB', flex: 1 }]}>
                                    <Text style={[styles.alertBtnText, { color: textPrimary }]}>Cancelar</Text>
                                </Pressable>
                            )}
                            <Pressable
                                onPress={() => {
                                    setAlertConfig(prev => ({ ...prev, visible: false }));
                                    alertConfig.onConfirm?.();
                                }}
                                style={[styles.alertBtn, {
                                    backgroundColor: alertConfig.type === 'danger' ? '#EF4444' : '#8B5CF6',
                                    flex: alertConfig.showCancel ? 1 : 0,
                                    minWidth: alertConfig.showCancel ? 0 : 120
                                }]}>
                                <Text style={[styles.alertBtnText, { color: '#FFF' }]}>
                                    {alertConfig.type === 'info' && alertConfig.showCancel ? 'Galería' : (alertConfig.type === 'danger' ? 'Confirmar' : 'Aceptar')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Premium Action Sheet for Image Selection */}
            <Modal
                transparent
                visible={imagePickerVisible}
                animationType="slide"
                onRequestClose={() => setImagePickerVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setImagePickerVisible(false)}
                >
                    <View style={[styles.actionSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
                        <View style={[styles.actionSheetIndicator, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />

                        <View style={styles.actionSheetHeader}>
                            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Actualizar Foto</Text>
                            <Text style={[styles.actionSheetSubtitle, { color: textSecondary }]}>Selecciona un origen para tu nueva imagen de perfil</Text>
                        </View>

                        <View style={styles.actionOptionsList}>
                            <Pressable
                                onPress={() => {
                                    setImagePickerVisible(false);
                                    setTimeout(takePhoto, 500);
                                }}
                                style={({ pressed }) => [
                                    styles.actionOptionItem,
                                    { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' },
                                    pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                                ]}
                            >
                                <View style={[styles.actionIconWrapper, { backgroundColor: '#8B5CF620' }]}>
                                    <Ionicons name="camera" size={26} color="#8B5CF6" />
                                </View>
                                <View style={styles.actionTextWrapper}>
                                    <Text style={[styles.actionLabel, { color: textPrimary }]}>Cámara</Text>
                                    <Text style={[styles.actionDesc, { color: textSecondary }]}>Tomar una foto instantánea</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setImagePickerVisible(false);
                                    setTimeout(pickImage, 500);
                                }}
                                style={({ pressed }) => [
                                    styles.actionOptionItem,
                                    { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' },
                                    pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                                ]}
                            >
                                <View style={[styles.actionIconWrapper, { backgroundColor: '#10B98120' }]}>
                                    <Ionicons name="images" size={26} color="#10B981" />
                                </View>
                                <View style={styles.actionTextWrapper}>
                                    <Text style={[styles.actionLabel, { color: textPrimary }]}>Galería</Text>
                                    <Text style={[styles.actionDesc, { color: textSecondary }]}>Elegir de tu biblioteca</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => setImagePickerVisible(false)}
                            style={({ pressed }) => [
                                styles.actionCancelButton,
                                { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
                                pressed && { opacity: 0.8 }
                            ]}
                        >
                            <Text style={[styles.actionCancelLabel, { color: textPrimary }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
            {/* Estado Civil Picker Modal */}
            <Modal
                transparent
                visible={estadoCivilPickerVisible}
                animationType="slide"
                onRequestClose={() => setEstadoCivilPickerVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setEstadoCivilPickerVisible(false)}
                >
                    <View style={[styles.actionSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
                        <View style={[styles.actionSheetIndicator, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />

                        <View style={styles.actionSheetHeader}>
                            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Estado Civil</Text>
                            <Text style={[styles.actionSheetSubtitle, { color: textSecondary }]}>Selecciona tu estado civil actual</Text>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {ESTADO_CIVIL_OPTIONS.map((option) => (
                                <Pressable
                                    key={option}
                                    onPress={() => {
                                        setEstadoCivil(option);
                                        setTimeout(() => {
                                            setEstadoCivilPickerVisible(false);
                                        }, 150);
                                    }}
                                    style={({ pressed }) => [
                                        styles.actionOptionItem,
                                        {
                                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                            borderColor: estadoCivil === option ? '#8B5CF6' : (isDark ? '#374151' : '#E5E7EB'),
                                            borderWidth: estadoCivil === option ? 2 : 1,
                                            marginBottom: 12
                                        },
                                        pressed && { opacity: 0.7 }
                                    ]}
                                >
                                    <Text style={[
                                        styles.actionLabel,
                                        { color: estadoCivil === option ? '#8B5CF6' : textPrimary }
                                    ]}>
                                        {option}
                                    </Text>
                                    {estadoCivil === option && <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />}
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Pressable
                            onPress={() => setEstadoCivilPickerVisible(false)}
                            style={({ pressed }) => [
                                styles.actionCancelButton,
                                { backgroundColor: isDark ? '#374151' : '#F3F4F6', marginTop: 15 },
                                pressed && { opacity: 0.8 }
                            ]}
                        >
                            <Text style={[styles.actionCancelLabel, { color: textPrimary }]}>Cerrar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900' },
    profileHero: { alignItems: 'center', marginVertical: 20 },
    avatarBorder: { width: 120, height: 120, borderRadius: 50, borderWidth: 4, padding: 4, position: 'relative' },
    avatar: { width: '100%', height: '100%', borderRadius: 45 },
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 50 },
    editPhotoBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
    userName: { fontSize: 24, fontWeight: '900', marginTop: 15 },
    userNick: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    userRole: { fontSize: 12, fontWeight: '800', marginTop: 2 },
    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
    inputGroup: { borderRadius: 16, padding: 15, borderWidth: 1, marginBottom: 15 },
    row: { flexDirection: 'row' },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    input: { fontSize: 16, fontWeight: '600', padding: 0 },
    statsGrid: { flexDirection: 'row', gap: 15 },
    statCard: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center' },
    statVal: { fontSize: 24, fontWeight: '900', color: '#8B5CF6' },
    statLab: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    footer: { paddingHorizontal: 20, marginTop: 30, gap: 10 },
    saveBtn: { backgroundColor: '#8B5CF6', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56 },
    logoutBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    alertCard: { width: '85%', borderRadius: 32, padding: 24, alignItems: 'center' },
    alertIconHeader: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    alertTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
    alertMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
    alertActions: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
    alertBtn: { flex: 1, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { fontSize: 14, fontWeight: '800' },
    // Premium Action Sheet Styles
    actionSheet: { width: '100%', position: 'absolute', bottom: 0, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: 50, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 20 },
    actionSheetIndicator: { width: 50, height: 6, borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
    actionSheetHeader: { marginBottom: 30, alignItems: 'center' },
    actionSheetTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
    actionSheetSubtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', opacity: 0.8 },
    actionOptionsList: { gap: 16, marginBottom: 30 },
    actionOptionItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1, gap: 18 },
    actionIconWrapper: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    actionTextWrapper: { flex: 1 },
    actionLabel: { fontSize: 17, fontWeight: '800' },
    actionDesc: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    actionCancelButton: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    actionCancelLabel: { fontSize: 16, fontWeight: '800' },
    selectTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 30, // Match TextInput height
    },
    inputText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
