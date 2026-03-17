import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as NavigationBar from 'expo-navigation-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import Toast from 'react-native-toast-message';
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
    const isBiometricEnabled = useAuthStore((state) => state.isBiometricEnabled);
    const setBiometricEnabled = useAuthStore((state) => state.setBiometricEnabled);
    const saveCredentials = useAuthStore((state) => state.saveCredentials);
    const getCredentials = useAuthStore((state) => state.getCredentials);

    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'dark';
    const isDark = colorScheme === 'dark';

    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(hasHardware && isEnrolled);
    };

    const hasAutoPrompted = useRef(false);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS === 'android') {
                NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
            }

            // Auto-trigger biometric login if enabled
            if (isBiometricEnabled && isBiometricSupported && !hasAutoPrompted.current) {
                hasAutoPrompted.current = true;
                handleBiometricLogin();
            }

            return () => {
                // Reset flag when screen loses focus
                hasAutoPrompted.current = false;
            };
        }, [isDark, isBiometricEnabled, isBiometricSupported])
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
            showAlert('AtenciÃ³n', 'Por favor, ingresa tu usuario o email en el campo de arriba para solicitar el reseteo.', 'warning');
            return;
        }

        showAlert(
            'Resetear ContraseÃ±a',
            `Â¿EstÃ¡s seguro que deseas resetear la contraseÃ±a de @${username}? La nueva contraseÃ±a serÃ¡ tu nÃºmero de RUN.`,
            'info',
            async () => {
                setLoading(true);
                try {
                    const res = await apiClient('/auth/reset-password', {
                        method: 'POST',
                        body: JSON.stringify({ identifier: username.trim() })
                    });

                    if (res.success) {
                        showAlert('Ã‰xito', 'Tu contraseÃ±a ha sido reseteada. Revisa tu WhatsApp para ver los detalles.', 'success');
                    } else {
                        throw new Error(res.message);
                    }
                } catch (err: any) {
                    showAlert('Error', err.message || 'No se pudo resetear la contraseÃ±a', 'danger');
                } finally {
                    setLoading(false);
                }
            },
            true
        );
    };

    const handleLogin = async () => {
        if (!username || !password) {
            // Si la huella estÃ¡ habilitada y los campos estÃ¡n vacÃ­os, re-intentar huella
            if (isBiometricEnabled && isBiometricSupported) {
                await handleBiometricLogin();
                return;
            }
            setError('Por favor ingresa tu usuario y contraseÃ±a');
            return;
        }
        await performLogin(username.trim(), password);
    };

    const performLogin = async (u: string, p: string) => {
        setError('');
        setLoading(true);

        try {
            const res = await login(u, p);
            if (res.requiereCodigo) {
                setTempAuthData({ username: u, password: p, userTmp: res.user });
                router.push('/(auth)/verify-code');
            } else {
                if (res.asistenciaRegistrada) {
                    Toast.show({
                        type: 'success',
                        text1: 'Asistencia Registrada',
                        text2: 'Tu asistencia ha sido registrada automÃ¡ticamente',
                    });
                }

                // Si el login fue manual y las biometrÃ­as estÃ¡n soportadas pero no habilitadas,
                // preguntar al usuario si desea habilitarlas.
                if (isBiometricSupported && !isBiometricEnabled) {
                    showAlert(
                        'Acceso BiomÃ©trico',
                        'Â¿Te gustarÃ­a habilitar el inicio de sesiÃ³n con huella dactilar para la prÃ³xima vez?',
                        'info',
                        async () => {
                            await saveCredentials(u, p);
                            await setBiometricEnabled(true);
                            router.replace('/');
                        },
                        true
                    );
                    // No redirigimos inmediatamente para dejar que responda el alert
                    // Pero si el alert se cierra sin aceptar, necesitamos ir al index.
                    // En este caso, el alert tiene el control.
                } else {
                    // Si ya estÃ¡ habilitado, actualizamos las credenciales guardadas por si cambiaron
                    if (isBiometricEnabled) {
                        await saveCredentials(u, p);
                    }
                    router.replace('/');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesiÃ³n');
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        if (!isBiometricEnabled || isPrompting) {
            if (!isBiometricEnabled) {
                showAlert('AtenciÃ³n', 'Debes iniciar sesiÃ³n manualmente y habilitar la opciÃ³n de huella dactilar primero.', 'warning');
            }
            return;
        }

        setIsPrompting(true);
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Inicia sesiÃ³n con tu huella dactilar',
                fallbackLabel: 'Usar contraseÃ±a',
                disableDeviceFallback: false,
                cancelLabel: 'Cancelar',
            });

            if (result.success) {
                const creds = await getCredentials();
                if (creds) {
                    setUsername(creds.username);
                    setPassword(creds.password);
                    await performLogin(creds.username, creds.password);
                } else {
                    showAlert('Error', 'No se encontraron credenciales guardadas. Inicia sesiÃ³n manualmente.', 'danger');
                }
            }
        } finally {
            setIsPrompting(false);
        }
    };

    const [isPrompting, setIsPrompting] = useState(false);

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
                        <Pressable 
                            style={{ flex: 1 }} 
                            onPress={() => {
                                // Si se cerrÃ³ el modal, tocar el fondo lo vuelve a abrir
                                if (isBiometricEnabled && !username && !password) {
                                    handleBiometricLogin();
                                }
                            }}
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
                                    Iniciar SesiÃ³n
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
                                            backgroundColor: isDark ? '#111111' : '#F3F4F6',
                                            color: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? '#374151' : '#E5E7EB',
                                        },
                                    ]}
                                    placeholder="pepe (se completarÃ¡ automÃ¡ticamente)"
                                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                    autoCapitalize="none"
                                    value={username}
                                    onChangeText={setUsername}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />

                                <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000', marginTop: 20 }]}>ContraseÃ±a</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: isDark ? '#111111' : '#F3F4F6',
                                                color: isDark ? '#FFFFFF' : '#000000',
                                                borderColor: isDark ? '#374151' : '#E5E7EB',
                                                width: '100%',
                                            },
                                        ]}
                                        placeholder="Ingresa tu contraseÃ±a"
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
                                <View style={styles.actionRow}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.loginButton,
                                            {
                                                backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                                borderColor: isDark ? '#FFFFFF' : '#000000',
                                                flex: 1,
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
                                                Iniciar SesiÃ³n
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>

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
                                        Â¿Olvidaste tu contraseÃ±a?
                                    </Text>
                                </Pressable>
                            </View>
                            </AnimatedScreen>
                        </Pressable>
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
                    <View style={[styles.alertCard, { backgroundColor: isDark ? '#111111' : '#FFFFFF' }]}>
                        <View style={[styles.alertIconHeader, {
                            backgroundColor: alertConfig.type === 'danger' ? '#EF444420' :
                                alertConfig.type === 'success' ? '#10B98120' :
                                    alertConfig.type === 'warning' ? '#F59E0B20' : '#E11D4820'
                        }]}>
                            <Ionicons
                                name={alertConfig.type === 'danger' ? 'alert-circle' :
                                    alertConfig.type === 'success' ? 'checkmark-circle' :
                                        alertConfig.type === 'warning' ? 'warning' : 'information-circle'}
                                size={40}
                                color={alertConfig.type === 'danger' ? '#EF4444' :
                                    alertConfig.type === 'success' ? '#10B981' :
                                        alertConfig.type === 'warning' ? '#F59E0B' : '#E11D48'}
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
                                    backgroundColor: alertConfig.type === 'danger' ? '#EF4444' : '#E11D48',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 35,
        gap: 12,
    },
    biometricButton: {
        height: 60,
        width: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
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
