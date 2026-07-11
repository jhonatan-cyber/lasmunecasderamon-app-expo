import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { showToast } from '@/utils/toast-lazy';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services';
import { resetPasswordSchema } from '@lasmunecasderamon/validations';

export interface AlertConfig {
    visible: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'danger';
    onConfirm?: () => void;
    showCancel?: boolean;
}

export default function useLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [resetRun, setResetRun] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPrompting, setIsPrompting] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

    const passwordRef = useRef<TextInput>(null);

    const login = useAuthStore((state) => state.login);
    const setTempAuthData = useAuthStore((state) => state.setTempAuthData);
    const isBiometricEnabled = useAuthStore((state) => state.isBiometricEnabled);
    const setBiometricEnabled = useAuthStore((state) => state.setBiometricEnabled);
    const saveCredentials = useAuthStore((state) => state.saveCredentials);
    const getCredentials = useAuthStore((state) => state.getCredentials);

    const router = useRouter();

    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    const checkBiometrics = useCallback(async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(hasHardware && isEnrolled);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            void checkBiometrics();
        }, 0);
        return () => clearTimeout(timer);
    }, [checkBiometrics]);

    const hasAutoPrompted = useRef(false);

    const [alertConfig, setAlertConfig] = useState<AlertConfig>({
        visible: false, title: '', message: '', type: 'info'
    });

    const showAlert = useCallback((
        title: string,
        message: string,
        type: 'info' | 'success' | 'warning' | 'danger' = 'info',
        onConfirm?: () => void,
        showCancel = false
    ) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
    }, []);

    const closeAlert = useCallback(() => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    }, []);

    const handleResetPassword = useCallback(async () => {
        const validation = resetPasswordSchema.safeParse({ run: resetRun });

        if (!validation.success) {
            showAlert(
                'Atención',
                validation.error.issues[0]?.message || 'Por favor, ingresa un RUN válido.',
                'warning'
            );
            return;
        }

        const { run } = validation.data;

        showAlert(
            'Resetear Contraseña',
            `¿Estás seguro que deseas resetear la contraseña de @${username}? La nueva contraseña será tu número de RUN.`,
            'info',
            async () => {
                setLoading(true);
                try {
                    const res = await authService.resetPassword({ run });

                    if (res.success) {
                        setShowResetPasswordModal(false);
                        setResetRun('');
                        showAlert(
                            'Éxito',
                            'Tu contraseña ha sido reseteada. Revisa tu WhatsApp para ver los detalles.',
                            'success'
                        );
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
    }, [resetRun, showAlert, username]);

    const performLogin = useCallback(async (u: string, p: string) => {
        setError('');
        setLoading(true);

        try {
            const res = await login(u, p);
            if (res.requiereCodigo) {
                setTempAuthData({ username: u, password: p, userTmp: res.user });
                router.push('/(auth)/verify-code');
            } else {
                if (res.asistenciaRegistrada) {
                    showToast({
                        type: 'success',
                        text1: 'Asistencia Registrada',
                        text2: 'Tu asistencia ha sido registrada automáticamente',
                    });
                }
                if (isBiometricSupported && !isBiometricEnabled) {
                    showAlert(
                        'Acceso Biométrico',
                        '¿Te gustaría habilitar el inicio de sesión con huella dactilar para la próxima vez?',
                        'info',
                        async () => {
                            await saveCredentials(u, p);
                            await setBiometricEnabled(true);
                            router.replace('/');
                        },
                        true
                    );
                } else {
                    if (isBiometricEnabled) {
                        await saveCredentials(u, p);
                    }
                    router.replace('/');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    }, [
        isBiometricEnabled, isBiometricSupported, login, router,
        saveCredentials, setBiometricEnabled, setTempAuthData, showAlert,
    ]);

    const handleLogin = useCallback(async () => {
        if (!username || !password) {
            if (isBiometricEnabled && isBiometricSupported) {
                await handleBiometricLogin();
                return;
            }
            setError('Por favor ingresa tu usuario y contraseña');
            return;
        }
        await performLogin(username.trim(), password);
    }, [username, password, isBiometricEnabled, isBiometricSupported, performLogin]);

    const handleQRScan = useCallback(async (data: string) => {
        setShowQRScanner(false);
        setLoading(true);
        setError('');

        try {
            const res = await login('', '', undefined, data);

            if (res.asistenciaRegistrada) {
                showToast({
                    type: 'success',
                    text1: '¡Bienvenido/a!',
                    text2: 'Tu asistencia ha sido registrada automáticamente',
                });
            }

            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Error al validar código QR');
        } finally {
            setLoading(false);
        }
    }, [login, router]);

    const handleBiometricLogin = useCallback(async () => {
        if (!isBiometricEnabled || isPrompting) {
            if (!isBiometricEnabled) {
                showAlert(
                    'Atención',
                    'Debes iniciar sesión manualmente y habilitar la opción de huella dactilar primero.',
                    'warning'
                );
            }
            return;
        }

        setIsPrompting(true);
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Inicia sesión con tu huella dactilar',
                fallbackLabel: 'Usar contraseña',
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
                    showAlert(
                        'Error',
                        'No se encontraron credenciales guardadas. Inicia sesión manualmente.',
                        'danger'
                    );
                }
            }
        } finally {
            setIsPrompting(false);
        }
    }, [getCredentials, isBiometricEnabled, isPrompting, performLogin, showAlert]);

    const onAlertConfirm = useCallback(() => {
        closeAlert();
        alertConfig.onConfirm?.();
    }, [closeAlert, alertConfig.onConfirm]);

    const closeResetPasswordModal = useCallback(() => {
        setShowResetPasswordModal(false);
        setResetRun('');
    }, []);

    return {
        username, setUsername,
        password, setPassword,
        resetRun, setResetRun,
        showPassword, setShowPassword,
        error, setError,
        loading, setLoading,
        isPrompting,
        showQRScanner, setShowQRScanner,
        showResetPasswordModal,
        passwordRef,
        isBiometricSupported,
        isBiometricEnabled,
        alertConfig,
        closeAlert,
        onAlertConfirm,
        handleResetPassword,
        handleLogin,
        handleQRScan,
        handleBiometricLogin,
        showAlert,
        closeResetPasswordModal,
        setShowResetPasswordModal,
    };
}
