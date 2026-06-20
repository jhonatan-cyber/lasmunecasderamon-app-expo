import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Image,
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
    passwordRef: React.RefObject<TextInput | null>;
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
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const textMuted = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1C1C1E' : '#F3F4F6';
    const borderColor = isDark ? '#333' : '#E5E7EB';
    const errorBg = isDark ? '#1C1917' : '#FEF2F2';

    return (
        <View style={styles.formContainer}>
            {}
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/images/logo2.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {}
            <View style={styles.headerTextContainer}>
                <Text style={[styles.title, { color: textColor }]}>
                    Iniciar Sesión
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                    Ingresa tus credenciales para continuar
                </Text>
            </View>

            {}
            {error ? (
                <View style={[styles.errorContainer, { backgroundColor: errorBg }]}>
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
                placeholder="pepe (se completará automáticamente)"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
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
                    value={password}
                    onChangeText={onPasswordChange}
                    ref={passwordRef}
                    returnKeyType="go"
                    onSubmitEditing={onLogin}
                />
                <Pressable
                    style={styles.eyeButton}
                    onPress={onTogglePasswordVisibility}
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
                >
                    {loading ? (
                        <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} />
                    ) : (
                        <Text style={[styles.loginButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
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
                    >
                        <Ionicons name="finger-print-outline" size={28} color={textColor} />
                    </Pressable>
                )}
            </View>

            {}
            <Pressable
                onPress={onForgotPassword}
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
        position: 'relative',
        justifyContent: 'center',
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        height: 36,
        width: 36,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passwordInput: {
        width: '100%',
        paddingRight: 56,
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
        borderRadius: 9999,
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
        borderRadius: 9999,
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
    forgotPassword: {
        alignItems: 'center',
        marginTop: 20,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});

