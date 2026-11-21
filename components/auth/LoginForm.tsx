import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import React from 'react';
import {
    ActivityIndicator,
    Animated,
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
    accentColor: string;
    isBiometricEnabled: boolean;
    isBiometricSupported: boolean;
    rememberMe: boolean;
    passwordRef: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
    onUsernameChange: (v: string) => void;
    onPasswordChange: (v: string) => void;
    onTogglePasswordVisibility: () => void;
    onLogin: () => void;
    onQRPress: () => void;
    onBiometricPress: () => void;
    onForgotPassword: () => void;
    onRememberMeChange: (v: boolean) => void;
}

export default function LoginForm({
    username,
    password,
    showPassword,
    error,
    loading,
    isDark,
    accentColor,
    isBiometricEnabled,
    isBiometricSupported,
    rememberMe,
    passwordRef,
    onUsernameChange,
    onPasswordChange,
    onTogglePasswordVisibility,
    onLogin,
    onQRPress,
    onBiometricPress,
    onForgotPassword,
    onRememberMeChange,
}: Props) {
    const { isLandscape } = useResponsiveMetrics();
    const reducedMotion = useReducedMotion();

    // Estado de foco para glow neón en inputs
    const [usernameFocused, setUsernameFocused] = React.useState(false);
    const [passwordFocused, setPasswordFocused] = React.useState(false);

    // Glow neón en inputs cuando están enfocados (modo oscuro)
    const inputNeonGlow = isDark ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
        borderColor: accentColor,
        borderWidth: 2.5,
    } : {};

    // Glow neón en botón de login (modo oscuro)
    const loginButtonNeonGlow = isDark ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    } : {};

    // Colors derived from theme
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const textMuted = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1C1C1E' : '#F3F4F6';
    const borderColor = isDark ? '#333' : '#F3F4F6';
    const errorBg = isDark ? '#1C1917' : '#FEF2F2';
    const inputIconColor = isDark ? '#9CA3AF' : '#6B7280';
    const biometricBg = isDark ? '#1C1917' : '#F3F4F6';
    const separatorColor = isDark ? '#374151' : '#D1D5DB';

    // Validation: disable login button when fields are empty
    const isFormValid = username.trim().length > 0 && password.length > 0;

    // Error shake animation
    // `useMemo` y no `useRef(...).current`: leer el ref durante el render lo
    // prohíbe la regla react-hooks/refs (y el compilador de React).
    const shakeValue = React.useMemo(() => new Animated.Value(0), []);
    const startShake = React.useCallback(() => {
        if (reducedMotion) {
            // Sin animación shake cuando el usuario prefiere movimiento reducido.
            return;
        }
        shakeValue.setValue(0);
        Animated.sequence([
            Animated.timing(shakeValue, { toValue: 8, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeValue, { toValue: -8, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeValue, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeValue, { toValue: -4, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeValue, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    }, [shakeValue, reducedMotion]);

    // Trigger shake when error appears
    const prevErrorRef = React.useRef('');
    React.useEffect(() => {
        if (error && error !== prevErrorRef.current) {
            startShake();
        }
        prevErrorRef.current = error;
    }, [error, startShake]);

    const errorTranslateX = shakeValue;

    return (
        <View style={styles.formContainer}>
            {/* Logo with accessibility label */}
            <View style={[styles.logoContainer, isLandscape && styles.logoContainerCompact]}>
                <Image
                    source={require('../../assets/images/logo2.png')}
                    style={[styles.logo, isLandscape && styles.logoCompact]}
                    contentFit="contain"
                    accessibilityLabel="Logo de Las Muñecas de Ramón"
                />
            </View>

            {/* Error message with shake animation */}
            {error ? (
                <Animated.View
                    style={[
                        styles.errorContainer,
                        { backgroundColor: errorBg, transform: [{ translateX: errorTranslateX }] }
                    ]}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                >
                    <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
            ) : null}

            {/* Nick input with icon */}
            <Text style={[styles.label, { color: isDark ? textColor : '#FFFFFF' }]}>Nick</Text>
            <View style={[styles.inputWithIcon, { backgroundColor: cardBg, borderColor: usernameFocused && isDark ? accentColor : borderColor }, usernameFocused && isDark && inputNeonGlow]}>
                <Ionicons name="person-outline" size={20} color={inputIconColor} style={styles.inputIcon} />
                <TextInput
                    style={[
                        styles.inputWithIconField,
                        {
                            backgroundColor: 'transparent',
                            color: textColor,
                        },
                    ]}
                    placeholder="Ingresa tu nick"
                    placeholderTextColor={textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    importantForAutofill="yes"
                    accessibilityLabel="Nick"
                    value={username}
                    onChangeText={onUsernameChange}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                />
            </View>

            {/* Password label row with forgot password link */}
            <View style={styles.passwordLabelRow}>
                <Text style={[styles.label, { color: isDark ? textColor : '#FFFFFF' }]}>Contraseña</Text>
                <Pressable
                    onPress={onForgotPassword}
                    hitSlop={{ top: 12, bottom: 12, right: 8, left: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Recuperar contraseña"
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                    <Text style={[styles.forgotPasswordText, { color: accentColor }]}>
                        ¿Olvidaste tu contraseña?
                    </Text>
                </Pressable>
            </View>

            {/* Password input with icon */}
            <View style={[styles.inputWithIcon, styles.passwordContainer, { backgroundColor: cardBg, borderColor: passwordFocused && isDark ? accentColor : borderColor }, passwordFocused && isDark && inputNeonGlow]}>
                <Ionicons name="lock-closed-outline" size={20} color={inputIconColor} style={styles.inputIcon} />
                <TextInput
                    style={[
                        styles.inputWithIconField,
                        styles.passwordInput,
                        {
                            backgroundColor: 'transparent',
                            color: textColor,
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
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
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

            {/* Remember me checkbox */}
            <Pressable
                onPress={() => onRememberMeChange(!rememberMe)}
                hitSlop={{ top: 8, bottom: 8, right: 8, left: 8 }}
                accessibilityRole="checkbox"
                accessibilityLabel="Recordarme"
                accessibilityState={{ checked: rememberMe }}
                style={styles.rememberMeRow}
            >
                <View style={[styles.checkbox, { backgroundColor: rememberMe ? accentColor : 'transparent', borderColor: borderColor }]}>
                    {rememberMe && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={[styles.rememberMeText, { color: isDark ? textMuted : '#FFFFFF' }]}>Recordarme</Text>
            </Pressable>

            {/* Login button with accent color - no transparency */}
            <View style={[styles.loginButtonContainer, isDark && loginButtonNeonGlow]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.loginButton,
                        {
                            backgroundColor: accentColor,
                            opacity: 1,
                        },
                        (!isFormValid || loading) && { opacity: 0.6 },
                    ]}
                    onPress={onLogin}
                    disabled={loading || !isFormValid}
                    accessibilityRole="button"
                    accessibilityLabel="Ingresar"
                    accessibilityState={{ disabled: loading || !isFormValid, busy: loading }}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text maxFontSizeMultiplier={1.3} style={styles.loginButtonText}>
                            Ingresar
                        </Text>
                    )}
                </Pressable>
            </View>

            {/* Visual separator */}
            <View style={styles.separatorContainer}>
                <View style={[styles.separatorLine, { backgroundColor: separatorColor }]} />
                <Text style={[styles.separatorText, { color: textMuted }]}>o ingresa con</Text>
                <View style={[styles.separatorLine, { backgroundColor: separatorColor }]} />
            </View>

            {/* Alternative login methods with labels */}
            <View style={styles.altMethodsRow}>
                <View style={styles.altMethodItem}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.biometricButton,
                            {
                                backgroundColor: biometricBg,
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
                    <Text style={[styles.altMethodLabel, { color: textMuted }]}>Código QR</Text>
                </View>

                {(isBiometricEnabled && isBiometricSupported) && (
                    <View style={styles.altMethodItem}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.biometricButton,
                                {
                                    backgroundColor: biometricBg,
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
                        <Text style={[styles.altMethodLabel, { color: textMuted }]}>Huella</Text>
                    </View>
                )}
            </View>
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
    logoContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    logo: {
        width: 240,
        height: 160,
    },
    logoContainerCompact: {
        marginTop: 4,
        marginBottom: 8,
    },
    logoCompact: {
        width: 160,
        height: 100,
    },
    label: {
        fontSize: 14,
        fontFamily: FontFamily.semibold,
        marginBottom: 10,
        marginLeft: 4,
    },
    // Input with icon wrapper
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: BorderRadius.full,
        height: 60,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 8,
    },
    inputWithIconField: {
        flex: 1,
        height: '100%',
        borderRadius: BorderRadius.full,
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        shadowColor: 'transparent',
        elevation: 0,
        fontSize: 16,
        fontFamily: FontFamily.medium,
    },
    input: {
        height: 60,
        borderRadius: BorderRadius.full,
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
    // Password label row
    passwordLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
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
    // Error container
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
    // Remember me
    rememberMeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginLeft: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rememberMeText: {
        fontSize: 14,
        fontFamily: FontFamily.medium,
    },
    // Login button
    loginButtonContainer: {
        marginTop: 24,
    },
    loginButton: {
        height: 60,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF2D55',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    loginButtonText: {
        fontSize: 17,
        fontFamily: FontFamily.bold,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: '#FFFFFF',
    },
    // Separator
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 15,
    },
    separatorLine: {
        flex: 1,
        height: 1,
    },
    separatorText: {
        fontSize: 13,
        fontFamily: FontFamily.medium,
        marginHorizontal: 12,
    },
    // Alternative methods
    altMethodsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
    },
    altMethodItem: {
        alignItems: 'center',
        gap: 6,
    },
    altMethodLabel: {
        fontSize: 12,
        fontFamily: FontFamily.medium,
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
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: FontFamily.medium,
        textDecorationLine: 'underline',
    },
});

