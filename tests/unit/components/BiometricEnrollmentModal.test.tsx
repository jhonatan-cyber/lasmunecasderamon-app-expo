import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as Speech from 'expo-speech';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BiometricEnrollmentModal } from '@/components/shared/BiometricEnrollmentModal';
import { apiClientSafe } from '@/api/client';

const { takePictureMock, setBiometricoFacialEnrolled, medirMock, disponibleMock } = vi.hoisted(() => ({
    takePictureMock: vi.fn(),
    setBiometricoFacialEnrolled: vi.fn(),
    medirMock: vi.fn(),
    disponibleMock: vi.fn(),
}));

// El detector nativo no existe en tests: se controla desde acá si está
// disponible y qué rotación informa para cada foto.
vi.mock('@/components/shared/biometric/deteccionGiro', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/components/shared/biometric/deteccionGiro')>();
    return {
        ...actual,
        detectorFacialDisponible: disponibleMock,
        medirGiroDesdeFoto: medirMock,
    };
});

vi.mock('expo-camera', async () => {
    const ReactModule = await import('react');
    const CameraView = ReactModule.forwardRef((props: any, ref: any) => {
        ReactModule.useImperativeHandle(ref, () => ({ takePictureAsync: takePictureMock }));
        ReactModule.useEffect(() => {
            props.onCameraReady?.();
        }, []);
        return ReactModule.createElement('div', { 'data-facing': props.facing });
    });
    CameraView.displayName = 'CameraView';
    return {
        CameraView,
        useCameraPermissions: () => [{ granted: true, canAskAgain: true }, vi.fn()],
    };
});

vi.mock('react-native', () => ({
    StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {}, absoluteFillObject: {} },
    View: ({ children }: any) => <div>{children}</div>,
    Text: ({ children }: any) => <span>{children}</span>,
    Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
    TouchableOpacity: ({ children, onPress, disabled }: any) => (
        <button onClick={onPress} disabled={disabled}>
            {children}
        </button>
    ),
    ActivityIndicator: () => <span>cargando</span>,
    Modal: ({ children, visible }: any) => (visible ? <div>{children}</div> : null),
}));

vi.mock('react-native-svg', () => ({
    default: ({ children }: any) => <div>{children}</div>,
    Circle: (props: any) => <span data-dash={String(props.strokeDasharray)} />,
}));

vi.mock('expo-linear-gradient', () => ({
    LinearGradient: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({
    default: ({ name }: any) => <span>{name}</span>,
}));

vi.mock('@/hooks/useAccentColor', () => ({
    useAccentColor: () => ({ accentColor: '#2563EB', isDark: true }),
}));

vi.mock('@/store/authStore', () => {
    const useAuthStore = Object.assign((selector: any) => selector({ setBiometricoFacialEnrolled }), {
        getState: () => ({ user: { id: 'usuario-1' } }),
    });
    return { useAuthStore };
});

async function avanzar(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

/** Deja la cámara montada y lista (250 ms de apertura + onCameraReady). */
async function abrirCamara() {
    await avanzar(300);
}

/** Un ciclo completo: espera entre fotos + pausa del acierto + captura. */
const CICLO_MS = 1400;

describe('BiometricEnrollmentModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        takePictureMock.mockReset();
        takePictureMock.mockImplementation(async () => ({
            uri: 'file:///cache/chequeo.jpg',
            base64: 'Zm90by1kZQ==',
        }));
        medirMock.mockReset();
        disponibleMock.mockReset();
        disponibleMock.mockReturnValue(true);
        vi.mocked(apiClientSafe).mockClear();
        vi.mocked(Speech.speak).mockClear();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('abre la cámara frontal apenas se muestra el modal', async () => {
        render(<BiometricEnrollmentModal visible onClose={vi.fn()} onEnrolled={vi.fn()} />);
        await abrirCamara();

        expect(document.querySelector('[data-facing="front"]')).not.toBeNull();
        expect(screen.queryByText('Capturar')).toBeNull();
        expect(screen.queryByText('Capturar y finalizar')).toBeNull();
    });

    it('detecta el giro y toma las tres fotos sola, con su indicación de voz', async () => {
        const onEnrolled = vi.fn();
        render(<BiometricEnrollmentModal visible onClose={vi.fn()} onEnrolled={onEnrolled} />);
        await abrirCamara();
        fireEvent.click(screen.getByText('Empezar'));

        medirMock.mockResolvedValue({ disponible: true, rostro: true, yaw: 0 });
        await avanzar(CICLO_MS);
        expect(takePictureMock.mock.calls.some(([opts]) => opts?.base64 === true)).toBe(true);
        expect(screen.getByText('Girá a la izquierda')).toBeTruthy();

        medirMock.mockResolvedValue({ disponible: true, rostro: true, yaw: 40 });
        await avanzar(CICLO_MS);
        expect(screen.getByText('Girá a la derecha')).toBeTruthy();

        medirMock.mockResolvedValue({ disponible: true, rostro: true, yaw: -40 });
        await avanzar(CICLO_MS);

        expect(onEnrolled).toHaveBeenCalled();
        expect(vi.mocked(Speech.speak).mock.calls.map(([texto]) => texto)).toEqual([
            'Mire de frente',
            'Gire a la izquierda',
            'Gire a la derecha',
        ]);

        const finales = takePictureMock.mock.calls.filter(([opts]) => opts?.base64 === true);
        expect(finales).toHaveLength(3);

        const capturas = vi
            .mocked(apiClientSafe)
            .mock.calls.find(([url]) => String(url).endsWith('/biometric/captures'));
        const fotos = JSON.parse(String((capturas?.[1] as any)?.body)).fotos;
        expect(fotos.map((f: { lado: string }) => f.lado).sort()).toEqual([
            'derecha',
            'frente',
            'izquierda',
        ]);
    });

    it('no guarda la foto del perfil hasta que el giro alcanza el umbral', async () => {
        render(<BiometricEnrollmentModal visible onClose={vi.fn()} onEnrolled={vi.fn()} />);
        await abrirCamara();
        fireEvent.click(screen.getByText('Empezar'));

        medirMock.mockResolvedValue({ disponible: true, rostro: true, yaw: 0 });
        await avanzar(CICLO_MS);
        expect(takePictureMock.mock.calls.filter(([opts]) => opts?.base64 === true)).toHaveLength(1);

        // Giro insuficiente: sigue pidiendo sin capturar.
        medirMock.mockResolvedValue({ disponible: true, rostro: true, yaw: 8 });
        await avanzar(3000);
        expect(takePictureMock.mock.calls.filter(([opts]) => opts?.base64 === true)).toHaveLength(1);

        // Alcanza el umbral: captura y avanza.
        medirMock.mockResolvedValue({ disponible: true, rostro: true, yaw: 40 });
        await avanzar(CICLO_MS);
        expect(takePictureMock.mock.calls.filter(([opts]) => opts?.base64 === true)).toHaveLength(2);
        expect(screen.getByText('Girá a la derecha')).toBeTruthy();
    });

    it('sin detector nativo vuelve a la captura temporizada', async () => {
        disponibleMock.mockReturnValue(false);
        render(<BiometricEnrollmentModal visible onClose={vi.fn()} onEnrolled={vi.fn()} />);
        await abrirCamara();
        fireEvent.click(screen.getByText('Empezar'));

        await avanzar(500);
        expect(medirMock).not.toHaveBeenCalled();
        expect(takePictureMock.mock.calls.filter(([opts]) => opts?.base64 === true)).toHaveLength(0);

        await avanzar(4200);
        expect(takePictureMock.mock.calls.filter(([opts]) => opts?.base64 === true)).toHaveLength(1);
        expect(screen.getByText('Girá a la izquierda')).toBeTruthy();
    });
});
