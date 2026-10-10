import type { OfflineSession } from '@/utils/offlineSession';

export interface User {
    id: string;
    name: string;
    lastName: string;
    email: string;
    role: string;
    foto: string;
    username: string;
    phone?: string;
    address?: string;
    estado_civil?: string;
    nick?: string;
    qr_token?: string;
    two_factor_enabled?: boolean;
    forcePasswordChange?: boolean;
}

export interface LoginPayload {
    qr_token?: string;
    email?: string;
    password?: string;
    codigo?: string;
}

export interface LoginResponse {
    success: boolean;
    requiereCodigo?: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    asistenciaRegistrada?: boolean;
    message?: string;
}

export interface TempAuthData {
    username: string;
    password: string;
    userTmp?: User;
}

export interface LoginResult {
    requiereCodigo?: boolean;
    user?: User;
    asistenciaRegistrada?: boolean;
    forcePasswordChange?: boolean;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    sessionExpired: boolean;
    offlineSession: OfflineSession | null;
    login: (username: string, password: string, codigo?: string, qr_token?: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearSessionExpired: () => void;
    loadOfflineSession: () => Promise<OfflineSession | null>;
    startOfflineSession: (now?: number) => Promise<void>;
    clearOfflineSession: () => Promise<void>;
    canWorkOffline: (now?: number) => boolean;
    clearForcePasswordChange: () => Promise<void>;
    tempAuthData: TempAuthData | null;
    setTempAuthData: (data: TempAuthData | null) => void;
    updateProfile: (partialUser: Partial<User>) => Promise<boolean>;
    refreshUser: () => Promise<boolean>;
    isBiometricEnabled: boolean;
    setBiometricEnabled: (enabled: boolean) => Promise<void>;
    saveCredentials: (username: string, password: string) => Promise<void>;
    getCredentials: () => Promise<{ username: string; password: string } | null>;
    removeCredentials: () => Promise<void>;
    biometricType: 'fingerprint' | 'facial' | 'iris' | null;
    isBiometricAvailable: boolean;
    checkBiometricAvailability: () => Promise<void>;
    authenticateWithBiometric: () => Promise<boolean>;
    enable2FA: (password: string) => Promise<boolean>;
    disable2FA: (password: string) => Promise<boolean>;
}
