import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Appearance,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native';
import { apiClient } from '../../api/client';
import { AnimatedScreen } from '../../components/AnimatedScreen';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const passwordRef = useRef<TextInput>(null);

    const login = useAuthStore((state) => state.login);
    const setTempAuthData = useAuthStore((state) => state.setTempAuthData);
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'dark';
    const isDark = colorScheme === 'dark';

    useFocusEffect(
        useCallback(() => {
            // Con edgeToEdgeEnabled: true en app.json, setPosition y setBackgroundColor ya no son necesarios
            // y producen advertencias. Solo nos aseguramos de que el estilo de los botones sea el correcto.
            if (Platform.OS === 'android') {
                NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
            }
        }, [isDark])
    );

    const toggleTheme = () => {
        Appearance.setColorScheme(isDark ? 'light' : 'dark');
    };

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

    const handleResetPassword = async () => {
        if (!username.trim()) {
            showAlert('Atención', 'Por favor, ingresa tu usuario o email en el campo de arriba para solicitar el reseteo.', 'warning');
            return;
        }

        showAlert(
            'Resetear Contraseña',
            `¿Estás seguro que deseas resetear la contraseña de @${username}? La nueva contraseña será tu número de RUN.`,
            'info',
            async () => {
                setLoading(true);
                try {
                    const res = await apiClient('/auth/reset-password', {
                        method: 'POST',
                        body: JSON.stringify({ identifier: username.trim() })
                    });

                    if (res.success) {
                        showAlert('Éxito', 'Tu contraseña ha sido reseteada. Revisa tu WhatsApp para ver los detalles.', 'success');
                    } else {
                        throw new Error(res.message);
                    }
                } catch (err: any) {
                    showAlert('Error', err.message || 'No se pudo resetear la contraseña', 'danger');
                } finally {
                    setLoading(false);
                }
            },
            true
        );
    };

    const handleLogin = async () => {
        if (!username || !password) {
            setError('Por favor ingresa tu usuario y contraseña');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const res = await login(username.trim(), password);
            if (res.requiereCodigo) {
                setTempAuthData({ username: username.trim(), password, userTmp: res.user });
                router.push('/(auth)/verify-code');
            } else {
                // Login exitoso sin código → ir al index que redirige según rol
                router.replace('/');
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/images/login_bg.png')}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={isDark ? ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)', '#000000'] : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.8)', '#FFFFFF']}
                    style={StyleSheet.absoluteFillObject}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.inner}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <AnimatedScreen delay={100}>
                            <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />

                            {/* Logo */}
                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('../../assets/images/logo2.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            {/* Title */}
                            <View style={styles.headerTextContainer}>
                                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Iniciar Sesión
                                </Text>
                                <Text style={[styles.subtitle, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                                    Ingresa tus credenciales para continuar
                                </Text>
                            </View>

                            {/* Form */}
                            <View style={styles.formContainer}>
                                {error ? (
                                    <View style={[styles.errorContainer, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ) : null}

                                <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>Usuario</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                                            color: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? '#374151' : '#E5E7EB',
                                        },
                                    ]}
                                    placeholder="pepe (se completará automáticamente)"
                                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                    autoCapitalize="none"
                                    value={username}
                                    onChangeText={setUsername}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />

                                <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000', marginTop: 20 }]}>Contraseña</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                                                color: isDark ? '#FFFFFF' : '#000000',
                                                borderColor: isDark ? '#374151' : '#E5E7EB',
                                                width: '100%',
                                            },
                                        ]}
                                        placeholder="Ingresa tu contraseña"
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        ref={passwordRef}
                                        returnKeyType="go"
                                        onSubmitEditing={handleLogin}
                                    />
                                    <Pressable
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={isDark ? '#9CA3AF' : '#6B7280'}
                                        />
                                    </Pressable>
                                </View>

                                {/* Login Button */}
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.loginButton,
                                        {
                                            backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? '#FFFFFF' : '#000000',
                                        },
                                        loading && { opacity: 0.5 },
                                        pressed && !loading && { opacity: 0.8 },
                                    ]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} />
                                    ) : (
                                        <Text style={[styles.loginButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                            Iniciar Sesión
                                        </Text>
                                    )}
                                </Pressable>

                                {/* Theme Toggle */}
                                <Pressable
                                    style={({ pressed }) => [styles.themeToggle, pressed && { opacity: 0.6 }]}
                                    onPress={toggleTheme}
                                >
                                    <Ionicons
                                        name={isDark ? 'sunny-outline' : 'moon-outline'}
                                        size={28}
                                        color={isDark ? '#9CA3AF' : '#6B7280'}
                                    />
                                </Pressable>

                                {/* Forgot Password */}
                                <Pressable
                                    onPress={handleResetPassword}
                                    style={({ pressed }) => [styles.forgotPassword, pressed && { opacity: 0.6 }]}
                                >
                                    <Text style={[styles.forgotPasswordText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        ¿Olvidaste tu contraseña?
                                    </Text>
                                </Pressable>
                            </View>
                        </AnimatedScreen>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>

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

                        <Text style={[styles.alertTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{alertConfig.title}</Text>
                        <Text style={[styles.alertMessage, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{alertConfig.message}</Text>

                        <View style={styles.alertActions}>
                            {alertConfig.showCancel && (
                                <Pressable
                                    onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                                    style={[styles.alertBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB', flex: 1 }]}>
                                    <Text style={[styles.alertBtnText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Cancelar</Text>
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
                                    {alertConfig.type === 'danger' ? 'Confirmar' : 'Aceptar'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        justifyContent: 'center',
        paddingTop: 40,
        paddingBottom: 60,
    },
    headerTextContainer: {
        marginBottom: 35,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    logo: {
        width: 180,
        height: 120,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {
        width: '100%',
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        marginLeft: 4,
    },
    input: {
        height: 60,
        borderRadius: 20,
        paddingHorizontal: 24,
        fontSize: 16,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        height: 60,
    },
    eyeIcon: {
        position: 'absolute',
        right: 20,
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 10,
        zIndex: 10,
    },
    errorContainer: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    loginButton: {
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    themeToggle: {
        alignItems: 'center',
        marginTop: 24,
    },
    forgotPassword: {
        alignItems: 'center',
        marginTop: 20,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    alertCard: {
        width: '85%',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    alertIconHeader: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
    },
    alertMessage: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    alertBtn: {
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    alertBtnText: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
});
