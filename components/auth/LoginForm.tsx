import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

interface Props {
    username: string;
    password: string;
    showPassword: boolean;
    error: string;
    loading: boolean;
    isDark: boolean;
    isBiometricEnabled: boolean;
    isBiometricSupported: boolean;
    passwordRef: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
    onUsernameChange: (v: string) => void;
    onPasswordChange: (v: string) => void;
    onTogglePasswordVisibility: () => void;
    onLogin: () => void;
    onQRPress: () => void;
    onBiometricPress: () => void;
    onForgotPassword: () => void;
}

export default function LoginForm({
    username,
    password,
    showPassword,
    error,
    loading,
    isDark,
    isBiometricEnabled,
    isBiometricSupported,
    passwordRef,
    onUsernameChange,
    onPasswordChange,
    onTogglePasswordVisibility,
    onLogin,
    onQRPress,
    onBiometricPress,
    onForgotPassword,
}: Props) {
    const { isLandscape } = useResponsiveMetrics();
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const textMuted = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1C1C1E' : '#F3F4F6';
    const borderColor = isDark ? '#333' : '#E5E7EB';
    const errorBg = isDark ? '#1C1917' : '#FEF2F2';

    return (
        <View style={styles.formContainer}>
            {}
            <View style={[styles.logoContainer, isLandscape && styles.logoContainerCompact]}>
                <Image
                    source={require('../../assets/images/logo2.png')}
                    style={[styles.logo, isLandscape && styles.logoCompact]}
                    contentFit="contain"
                />
            </View>

            {}
            <View style={[styles.headerTextContainer, isLandscape && { marginBottom: 20 }]}>
                <Text style={[styles.title, { color: textColor }, isLandscape && { fontSize: 28 }]}>
                    Iniciar Sesión
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                    Ingresa tus credenciales para continuar
                </Text>
            </View>

            {}
            {error ? (
                <View
                    style={[styles.errorContainer, { backgroundColor: errorBg }]}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                >
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            {}
            <Text style={[styles.label, { color: textColor }]}>Usuario</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: cardBg,
                        color: textColor,
                        borderColor: borderColor,
                    },
                ]}
                placeholder="Ej: pepe"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                importantForAutofill="yes"
                accessibilityLabel="Usuario"
                value={username}
                onChangeText={onUsernameChange}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {}
            <Text style={[styles.label, { color: textColor, marginTop: 20 }]}>Contraseña</Text>
            <View style={styles.passwordContainer}>
                <TextInput
                    style={[
                        styles.input,
                        styles.passwordInput,
                        {
                            backgroundColor: cardBg,
                            color: textColor,
                            borderColor: borderColor,
                        },
                    ]}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor={textMuted}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    importantForAutofill="yes"
                    accessibilityLabel="Contraseña"
                    value={password}
                    onChangeText={onPasswordChange}
                    ref={passwordRef}
                    returnKeyType="go"
                    onSubmitEditing={onLogin}
                />
                <Pressable
                    style={styles.eyeButton}
                    onPress={onTogglePasswordVisibility}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    accessibilityState={{ selected: showPassword }}
                >
                    <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={textColor}
                    />
                </Pressable>
            </View>

            {}
            <View style={[styles.actionRow, { marginTop: 20 }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.loginButton,
                        {
                            backgroundColor: textColor,
                            borderColor: textColor,
                            width: '100%',
                        },
                        loading && { opacity: 0.5 },
                        pressed && !loading && { opacity: 0.8 },
                    ]}
                    onPress={onLogin}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Iniciar sesión"
                    accessibilityState={{ disabled: loading, busy: loading }}
                >
                    {loading ? (
                        <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} />
                    ) : (
                        <Text maxFontSizeMultiplier={1.3} style={[styles.loginButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                            Iniciar Sesión
                        </Text>
                    )}
                </Pressable>
            </View>

            {}
            <View style={[styles.actionRow, { justifyContent: 'center', marginTop: 15, gap: 20 }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.biometricButton,
                        {
                            backgroundColor: isDark ? '#1C1917' : '#F3F4F6',
                            borderColor: borderColor,
                        },
                        pressed && { opacity: 0.7 }
                    ]}
                    onPress={onQRPress}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Iniciar sesión con código QR"
                    accessibilityState={{ disabled: loading }}
                >
                    <Ionicons name="qr-code-outline" size={28} color={textColor} />
                </Pressable>

                {(isBiometricEnabled && isBiometricSupported) && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.biometricButton,
                            {
                                backgroundColor: isDark ? '#1C1917' : '#F3F4F6',
                                borderColor: borderColor,
                            },
                            pressed && { opacity: 0.7 }
                        ]}
                        onPress={onBiometricPress}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Iniciar sesión con biometría"
                        accessibilityState={{ disabled: loading }}
                    >
                        <Ionicons name="finger-print-outline" size={28} color={textColor} />
                    </Pressable>
                )}
            </View>

            {}
            <Pressable
                onPress={onForgotPassword}
                hitSlop={{ top: 12, bottom: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Recuperar contraseña"
                style={({ pressed }) => [styles.forgotPassword, pressed && { opacity: 0.6 }]}
            >
                <Text style={[styles.forgotPasswordText, { color: textMuted }]}>
                    ¿Olvidaste tu contraseña?
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    formContainer: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
        flex: 1,
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
    logoContainerCompact: {
        marginTop: 4,
        marginBottom: 8,
    },
    logoCompact: {
        width: 120,
        height: 70,
    },
    title: {
        fontSize: 34,
        fontFamily: FontFamily.display,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: FontFamily.regular,
        textAlign: 'center',
        lineHeight: 22,
    },
    label: {
        fontSize: 14,
        fontFamily: FontFamily.semibold,
        marginBottom: 10,
        marginLeft: 4,
    },
    input: {
        height: 60,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: 24,
        fontSize: 16,
        fontFamily: FontFamily.medium,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    passwordContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        height: 36,
        width: 36,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passwordInput: {
        width: '100%',
        paddingRight: 56,
    },
    errorContainer: {
        padding: 12,
        borderRadius: BorderRadius.md,
        marginBottom: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        fontFamily: FontFamily.medium,
        textAlign: 'center',
    },
    loginButton: {
        height: 60,
        borderRadius: BorderRadius.full,
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
        marginTop: 35,
    },
    biometricButton: {
        height: 60,
        width: 60,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    loginButtonText: {
        fontSize: 17,
        fontFamily: FontFamily.bold,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    forgotPassword: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        minHeight: 44,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: FontFamily.medium,
        textDecorationLine: 'underline',
    },
});

