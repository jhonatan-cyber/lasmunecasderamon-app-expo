import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function VerifyCodeScreen() {
    const [code, setCode] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const login = useAuthStore((state) => state.login);
    const tempAuthData = useAuthStore((state) => state.tempAuthData);

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme];

    // Create refs array for the 4 inputs
    const inputRefs = useRef<(TextInput | null)[]>([null, null, null, null]);

    const handleCodeChange = (text: string, index: number) => {
        setError(''); // clear error when typing

        // Only allow numbers
        const cleanText = text.replace(/[^0-9]/g, '');

        const newCode = [...code];
        newCode[index] = cleanText;
        setCode(newCode);

        // Auto-advance
        if (cleanText && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when last digit is filled
        if (cleanText && index === 3 && newCode.every(num => num !== '')) {
            Keyboard.dismiss();
            verifyCode(newCode.join(''));
        }
    };

    const verifyCode = async (fullCode: string) => {
        if (!tempAuthData) {
            setError('Error de sesión. Vuelve al login.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await login(tempAuthData.username, tempAuthData.password, fullCode);
            // Login exitoso con código → ir al index que redirige según rol
            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Código incorrecto. Intenta nuevamente.');
            setCode(['', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleBackspace = (text: string, index: number) => {
        if (text === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <ScrollView
                contentContainerStyle={styles.inner}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

                <Pressable
                    style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.backButtonText, { color: theme.icon }]}>← Volver</Text>
                </Pressable>

                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Verificación</Text>
                    <Text style={[styles.subtitle, { color: theme.tabIconDefault }]}>Ingresa el código seguro de acceso rápido.</Text>
                </View>

                <View style={styles.formContainer}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.codeInput,
                                    { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                                    digit !== '' && { borderColor: theme.tint, backgroundColor: colorScheme === 'dark' ? '#111827' : '#EEF2FF' },
                                    error !== '' && { borderColor: theme.error }
                                ]}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(text) => handleCodeChange(text, index)}
                                onKeyPress={({ nativeEvent }) => {
                                    if (nativeEvent.key === 'Backspace') {
                                        handleBackspace(digit, index);
                                    }
                                }}
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.verifyButton,
                            { backgroundColor: theme.tint },
                            (loading || !code.every(d => d !== '')) && { opacity: 0.5 },
                            pressed && !(loading || !code.every(d => d !== '')) && { opacity: 0.8 }
                        ]}
                        onPress={() => verifyCode(code.join(''))}
                        disabled={loading || !code.every(d => d !== '')}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.background} />
                        ) : (
                            <Text style={[styles.verifyButtonText, { color: theme.background }]}>Verificar e Ingresar</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flexGrow: 1,
        paddingHorizontal: 30,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 30,
        zIndex: 10,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    header: {
        marginBottom: 40,
        marginTop: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    formContainer: {
        width: '100%',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    codeInput: {
        width: 65,
        height: 75,
        borderRadius: 16,
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 20,
        textAlign: 'center',
        padding: 10,
        borderRadius: 8,
    },
    verifyButton: {
        height: 56,
        borderRadius: 9999, // rounded-full
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

